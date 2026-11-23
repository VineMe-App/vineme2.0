-- INS-4 (#399) and INS-5 (#400): followed up in time, on the request view.
--
-- Adds the three Team measures to dashboard_requests (DATA-1), one result per request, so
-- the Team tab and the Groups scorecard read them from the view instead of working them
-- out in the browser. The logic is apps/web/docs/dashboard/reference/followed-up-in-time.sql
-- (the counting rule agreed in DEC-3), using the view's own stage dates, which already
-- ignore notes from before the request and taps undone within an hour.
--
-- New columns, added at the end so existing readers are unaffected:
--   reached_out_on, spoken_to_on, attended_on        the day each stage was first reached
--   reached_out_in_time, spoken_to_in_time,
--   attended_in_time                                 'hit', 'miss' or null (not known yet)
--
-- It also reads users, notes and each group's leaders once each (materialized CTEs) instead
-- of once per request. With the users policies from 20261122120000, the old shape ran the
-- row-level security checks on users hundreds of times per query and timed out on a few
-- hundred people. The rows returned are the same.
--
-- One change from the reference query: joined_at only stands in for a stage date when it
-- is on or after the request date, because a rejoin reuses the membership row.
--
-- Replaces the view only. No table, column or policy changes.

create or replace view public.dashboard_requests
with (security_invoker = true)
as
with people as materialized (
	-- Everyone who isn't a test account, read once. Joining users row by row made row-level
	-- security run its checks once per request for every user, which timed out (see header).
	select u.id
	, u.first_name
	, u.last_name
	, u.name
	, u.avatar_url
	, u.newcomer
	from public.users u
	where coalesce(u.first_name, '') not ilike '%test%'
	  and coalesce(u.last_name, '') not ilike '%test%'
)
, notes as materialized (
	-- Notes that belong to the current request on each membership row.
	select n.*
	from public.group_membership_notes n
	join public.group_memberships gm on gm.id = n.membership_id
	where n.created_at >= gm.created_at
)
, journey_taps as (
	select membership_id
	, created_at
	, new_journey_status
	, lead(new_journey_status) over (partition by membership_id order by created_at) as next_journey
	, lead(created_at) over (partition by membership_id order by created_at) as next_at
	from notes
	where new_journey_status is not null
)
, stage_dates as materialized (
	-- When each stage was first reached. Taps undone within an hour are ignored.
	select membership_id
	, min(created_at) filter (where new_journey_status = 1) as reached_out_at
	, min(created_at) filter (where new_journey_status = 2) as spoken_to_at
	, min(created_at) filter (where new_journey_status = 3) as attended_at
	from journey_taps
	where next_journey is null
	   or next_journey >= new_journey_status
	   or next_at - created_at >= interval '1 hour'
	group by membership_id
)
, actions as materialized (
	-- Last action: a leader's note, a stage moving forward, or a status change.
	-- Clergy notes marked "spoken to them" join this once FU-6 adds them.
	select membership_id
	, max(created_at) as last_action_at
	, min(created_at) filter (where new_status = 'active') as first_added_at
	from notes
	where note_type = 'manual'
	   or new_journey_status > coalesce(previous_journey_status, 0)
	   or new_status is distinct from previous_status
	group by membership_id
)
, archived as materialized (
	-- The note that archived the request, with the reason the leader picked.
	select distinct on (membership_id) membership_id
	, created_at as archived_at
	, reason as archive_reason
	from notes
	where new_status = 'archived'
	order by membership_id, created_at desc
)
, group_leaders as materialized (
	-- Every active leader of each group, worked out once per group rather than per request.
	select lm.group_id
	, jsonb_agg(
		jsonb_build_object('id', lu.id, 'name', lu.name, 'avatar_url', lu.avatar_url)
		order by lu.name
	) as leaders
	from public.group_memberships lm
	join people lu on lu.id = lm.user_id
	where lm.role in ('leader', 'admin')
	  and lm.status = 'active'
	group by lm.group_id
)
, base as (
	select gm.id as request_id
	, gm.user_id as person_id
	, u.first_name
	, u.last_name
	, u.name as person_name
	, u.avatar_url as person_avatar_url
	, u.newcomer
	, gm.group_id
	, g.title as group_title
	, g.status as group_status
	, g.at_capacity as group_at_capacity
	, g.service_id
	, g.church_id
	, coalesce(l.leaders, '[]'::jsonb) as leaders
	, gm.role
	, gm.status
	, gm.journey_status as stage
	, gm.created_at as requested_at
	, sd.reached_out_at
	, sd.spoken_to_at
	, sd.attended_at
	, case when gm.status in ('active', 'inactive')
		then coalesce(gm.joined_at, a.first_added_at) end as added_at
	, case when gm.status = 'archived' then ar.archived_at end as archived_at
	, case when gm.status = 'archived' then ar.archive_reason end as archive_reason
	, a.last_action_at
	-- The day each stage was first reached, for the Team measures. A skipped stage takes
	-- the date of the later one, and an added request with no stage notes falls back to
	-- the day it was added. joined_at from before the request belongs to an earlier
	-- request on a reused row, so it's ignored, like the notes above.
	, coalesce(sd.reached_out_at, sd.spoken_to_at, sd.attended_at, j.joined_at)::date as reached_out_on
	, coalesce(sd.spoken_to_at, sd.attended_at, j.joined_at)::date as spoken_to_on
	, coalesce(sd.attended_at, j.joined_at)::date as attended_on
	, case gm.journey_status
		when 1 then 10
		when 2 then 14
		when 3 then 30
		else 6
		end as limit_days
	-- Not contacted counts from the request; every other stage from the last action.
	, case when gm.journey_status is null then gm.created_at::date
		else coalesce(a.last_action_at, gm.created_at)::date
		end as clock_start_on
	from public.group_memberships gm
	join people u on u.id = gm.user_id
	join public.groups g on g.id = gm.group_id
	left join group_leaders l on l.group_id = gm.group_id
	left join stage_dates sd on sd.membership_id = gm.id
	left join actions a on a.membership_id = gm.id
	left join archived ar on ar.membership_id = gm.id
	cross join lateral (
		select case when gm.joined_at >= gm.created_at then gm.joined_at end as joined_at
	) j
	where (
		-- Signed-in church admins see their own service's requests.
		(public.current_user_has_role('church_admin') and g.service_id = public.current_user_service_id())
		-- Database roles that already bypass row-level security (the SQL editor, Metabase,
		-- server code) see every service, so they can filter by service_id themselves.
		or current_user in ('postgres', 'service_role')
	  )
)
select request_id
, person_id
, first_name
, last_name
, person_name
, person_avatar_url
, newcomer
, group_id
, group_title
, group_status
, group_at_capacity
, service_id
, church_id
, leaders
, role
, status
, stage
, requested_at
, reached_out_at
, spoken_to_at
, attended_at
, added_at
, archived_at
, archive_reason
, last_action_at
, case when status = 'pending' then current_date - clock_start_on end as days_since_last_action
, case when status = 'pending' then limit_days end as limit_days
, case when status <> 'pending' then null
	when current_date - clock_start_on > limit_days then 'needs_attention'
	when stage is null then 'needs_first_contact'
	else 'on_track'
	end as follow_up
, case when status = 'pending' then limit_days - (current_date - clock_start_on) end as days_until_due
-- Followed up in time (DEC-3): 'hit', 'miss', or null while the result isn't known yet.
-- Limits count from the request date: reached out within 6 days, spoken to within 16,
-- attended within 30. Archived before reaching the stage is a miss, whatever the reason.
, reached_out_on
, spoken_to_on
, attended_on
, case when reached_out_on is not null
		then case when reached_out_on - requested_at::date <= 6 then 'hit' else 'miss' end
	when status = 'archived' then 'miss'
	when current_date - requested_at::date > 6 then 'miss'
	end as reached_out_in_time
, case when spoken_to_on is not null
		then case when spoken_to_on - requested_at::date <= 16 then 'hit' else 'miss' end
	when status = 'archived' then 'miss'
	when current_date - requested_at::date > 16 then 'miss'
	end as spoken_to_in_time
, case when attended_on is not null
		then case when attended_on - requested_at::date <= 30 then 'hit' else 'miss' end
	when status = 'archived' then 'miss'
	when current_date - requested_at::date > 30 then 'miss'
	end as attended_in_time
from base;

comment on view public.dashboard_requests is
	'Clergy dashboard: one row per request (group_memberships row) with stage, time limit, follow-up state and followed up in time. Definitions in apps/web/docs/dashboard/glossary.md. DATA-1, INS-4.';

-- Grants are unchanged: signed-in users only, and the filter above limits them to church
-- admins and their own service.
revoke all on public.dashboard_requests from public, anon;
grant select on public.dashboard_requests to authenticated, service_role;
