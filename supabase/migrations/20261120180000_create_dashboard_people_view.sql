-- DATA-2 (#376): the person view.
--
-- One row per member, with their role, outcome, furthest stage, request counts and
-- needs help state. The clergy dashboard reads its people numbers from here, and its
-- request numbers from dashboard_requests (DATA-1), so that every page agrees.
--
-- Built from apps/web/docs/dashboard/reference/people.sql (the definitions agreed in
-- DEC-1), with these changes:
--   * scoped to the signed-in church admin's church and service instead of hard-coded ids
--   * leaders include role 'admin', which the code treats like a leader, as DATA-1 does
--     (there are none today, so the counts don't change)
--   * adds role (Admin, Leader, Newcomer or Existing member) and whether any of their
--     requests needs attention, taken from dashboard_requests rather than worked out again
--   * returns values, not labels; the dashboard's terms file turns them into words
--
-- A person's outcome counts all their memberships, in any group, open or closed, as the
-- glossary's Scope section says. Needs attention comes from dashboard_requests, so it only
-- counts requests to groups in the reader's service, as follow-ups do.
--
-- Definitions: apps/web/docs/dashboard/glossary.md.
--
-- Adds a view only. No table, column or policy changes.

create or replace view public.dashboard_people
with (security_invoker = true)
as
with members as (
	-- Everyone at the reader's church and service. Leaders and admins included, test
	-- accounts excluded.
	select u.id as person_id
	, u.first_name
	, u.last_name
	, u.name as person_name
	, u.avatar_url as person_avatar_url
	, u.church_id
	, u.service_id
	, u.created_at as signed_up_at
	, coalesce(u.newcomer, false) as newcomer
	, coalesce('church_admin' = any(u.roles), false) as is_admin
	, u.cannot_find_group_requested_at as needs_help_requested_at
	, u.cannot_find_group_contacted_at as needs_help_contacted_at
	, u.cannot_find_group_resolved_at as needs_help_resolved_at
	from public.users u
	where coalesce(u.first_name, '') not ilike '%test%'
	  and coalesce(u.last_name, '') not ilike '%test%'
	  and (
		-- Signed-in church admins see members of their own church and service.
		(public.current_user_has_role('church_admin')
			and u.church_id = public.current_user_church_id()
			and u.service_id = public.current_user_service_id())
		-- Database roles that already bypass row-level security (the SQL editor, Metabase,
		-- server code) see everyone, so they can filter by church_id and service_id themselves.
		or current_user in ('postgres', 'service_role')
	  )
)
, by_person as (
	-- Every membership the person has, in any group, open or closed.
	select gm.user_id as person_id
	, count(*) as requests
	, count(*) filter (where gm.status = 'pending') as pending_requests
	, bool_or(gm.journey_status = 3) as connected
	, bool_or(gm.journey_status = 3 and gm.status in ('active', 'inactive')) as plugged_in
	, max(coalesce(gm.journey_status, 0))
		filter (where gm.status = 'pending' and coalesce(gm.journey_status, 0) < 3) as best_pending_stage
	, bool_and(gm.status = 'archived') as all_archived
	-- Someone can only be added after Attended, so this should be zero. Anything else is a data error.
	, count(*) filter (where gm.status in ('active', 'inactive') and gm.journey_status is distinct from 3) as data_errors
	, bool_or(gm.role in ('leader', 'admin') and gm.status = 'active') as is_leader
	, bool_or(gm.status = 'active') as in_group_now
	from public.group_memberships gm
	join members m on m.person_id = gm.user_id
	group by gm.user_id
)
, follow_ups as (
	-- Taken from the request view, so needs attention is worked out in one place.
	select r.person_id
	, count(*) filter (where r.follow_up = 'needs_attention') as needs_attention_requests
	from public.dashboard_requests r
	group by r.person_id
)
select m.person_id
, m.first_name
, m.last_name
, m.person_name
, m.person_avatar_url
, m.church_id
, m.service_id
, m.signed_up_at
, m.signed_up_at >= now() - interval '30 days' as is_new
, m.newcomer
, m.is_admin
, coalesce(p.is_leader, false) as is_leader
-- Role: Admin, then Leader, then Newcomer or Existing member.
, case when m.is_admin then 'admin'
	when coalesce(p.is_leader, false) then 'leader'
	when m.newcomer then 'newcomer'
	else 'existing_member'
	end as role
, coalesce(p.requests, 0) as requests
, coalesce(p.pending_requests, 0) as pending_requests
, coalesce(p.connected, false) as connected
, coalesce(p.plugged_in, false) as plugged_in
, coalesce(p.in_group_now, false) as in_group_now
, coalesce(p.all_archived, false) as all_archived
-- Outcome: connected, not_yet_connected, archived or no_requests. check_data means an
-- added or left request that never reached Attended (see data_errors).
, case when p.person_id is null then 'no_requests'
	when p.connected then 'connected'
	when p.best_pending_stage is not null then 'not_yet_connected'
	when p.all_archived then 'archived'
	else 'check_data'
	end as outcome
-- Furthest stage: the outcome with Not yet connected split into its stages.
, case when p.person_id is null then 'no_requests'
	when p.connected then 'connected'
	when p.best_pending_stage = 2 then 'spoken_to'
	when p.best_pending_stage = 1 then 'reached_out'
	when p.best_pending_stage = 0 then 'not_contacted'
	when p.all_archived then 'archived'
	else 'check_data'
	end as furthest_stage
, coalesce(f.needs_attention_requests, 0) as needs_attention_requests
, coalesce(f.needs_attention_requests, 0) > 0 as needs_attention
-- Needs help: asked and not resolved since. A request after the last resolution counts
-- as open again.
, m.needs_help_requested_at is not null
	and (m.needs_help_resolved_at is null or m.needs_help_resolved_at < m.needs_help_requested_at)
	as needs_help
, case when m.needs_help_requested_at is null then null
	when m.needs_help_resolved_at >= m.needs_help_requested_at then 'resolved'
	when m.needs_help_contacted_at >= m.needs_help_requested_at then 'contacted'
	else 'not_contacted'
	end as needs_help_state
, m.needs_help_requested_at
, m.needs_help_contacted_at
, m.needs_help_resolved_at
, coalesce(p.data_errors, 0) as data_errors
from members m
left join by_person p on p.person_id = m.person_id
left join follow_ups f on f.person_id = m.person_id;

comment on view public.dashboard_people is
	'Clergy dashboard: one row per member with role, outcome, furthest stage, request counts and needs help. Definitions in apps/web/docs/dashboard/glossary.md. DATA-2.';

-- Only signed-in users can read it, and the filter above limits them to church admins,
-- and to their own church and service.
revoke all on public.dashboard_people from public, anon;
grant select on public.dashboard_people to authenticated, service_role;
