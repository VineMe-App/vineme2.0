-- DATA-1 (#375): the request view.
--
-- One row per request, meaning every group_memberships row (DEC-1), with its stage,
-- stage dates, last action, time limit and follow-up state. The clergy dashboard reads
-- its numbers from here so that every page agrees.
--
-- Built from apps/web/docs/dashboard/reference/follow-ups.sql (the rules agreed in DEC-2),
-- with these changes:
--   * leaders are a left join, so requests to a group with no active leader are kept
--   * test accounts are left out with a case-insensitive name match, as the glossary says
--   * notes from before the request date are ignored, because a rejoin reuses the old
--     membership row and resets created_at, and the old request's notes stay on it
--   * scoped to the signed-in church admin's service instead of a hard-coded service id
--
-- Definitions: apps/web/docs/dashboard/glossary.md. Labels are not stored here; the
-- dashboard's terms file turns the values below into words.
--
-- Adds a view only. No table, column or policy changes.

create or replace view public.dashboard_requests
with (security_invoker = true)
as
with notes as (
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
, stage_dates as (
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
, actions as (
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
, archived as (
	-- The note that archived the request, with the reason the leader picked.
	select distinct on (membership_id) membership_id
	, created_at as archived_at
	, reason as archive_reason
	from notes
	where new_status = 'archived'
	order by membership_id, created_at desc
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
	join public.users u on u.id = gm.user_id
	join public.groups g on g.id = gm.group_id
	left join lateral (
		select jsonb_agg(
			jsonb_build_object('id', lu.id, 'name', lu.name, 'avatar_url', lu.avatar_url)
			order by lu.name
		) as leaders
		from public.group_memberships lm
		join public.users lu on lu.id = lm.user_id
		where lm.group_id = gm.group_id
		  and lm.role in ('leader', 'admin')
		  and lm.status = 'active'
		  and coalesce(lu.first_name, '') not ilike '%test%'
		  and coalesce(lu.last_name, '') not ilike '%test%'
	) l on true
	left join stage_dates sd on sd.membership_id = gm.id
	left join actions a on a.membership_id = gm.id
	left join archived ar on ar.membership_id = gm.id
	where coalesce(u.first_name, '') not ilike '%test%'
	  and coalesce(u.last_name, '') not ilike '%test%'
	  and (
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
from base;

comment on view public.dashboard_requests is
	'Clergy dashboard: one row per request (group_memberships row) with stage, time limit and follow-up state. Definitions in apps/web/docs/dashboard/glossary.md. DATA-1.';

-- Only signed-in users can read it, and the filter above limits them to church admins,
-- and to their own service.
revoke all on public.dashboard_requests from public, anon;
grant select on public.dashboard_requests to authenticated, service_role;
