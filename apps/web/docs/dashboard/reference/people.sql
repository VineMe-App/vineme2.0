-- People: one row per member, using the definitions agreed in DEC-1 (docs/dashboard/glossary.md).
-- Connected = at least one group membership at Attended (journey_status 3). This is the 182 in Metabase.
-- If the total differs slightly, it's the wider test-account rule (any case) or someone with
-- no first name, whom the old filter dropped.
-- The reference for the person view (DATA-2). Runs as it is in Metabase.

with params as (
	select 'fc3835b8-af9d-4303-bc5d-0daeec736e35' as church_id
	, '52434036-c693-45ff-a79c-2b47220f879f' as service_id
)
, members as (
	-- Everyone at this church and service. Leaders and admins included, test accounts excluded.
	select u.id as user_id
	, u.first_name
	, u.last_name
	, u.created_at as signed_up_at
	, coalesce(u.newcomer, false) as newcomer
	, coalesce(u.roles::text like '%church_admin%', false) as is_admin -- works whether roles is json, jsonb, text or an array
	, coalesce(u.cannot_find_group, false) as cannot_find_group
	, u.cannot_find_group_requested_at
	, u.cannot_find_group_contacted_at
	, u.cannot_find_group_resolved_at
	from users u
	cross join params p
	where u.church_id::text = p.church_id
	and u.service_id::text = p.service_id
	and coalesce(u.first_name, '') not ilike '%test%'
	and coalesce(u.last_name, '') not ilike '%test%'
)
, by_person as (
	select gm.user_id
	, count(*) as memberships
	, count(*) filter (where gm.status = 'pending') as pending_memberships
	, bool_or(gm.journey_status = 3) as connected
	, bool_or(gm.journey_status = 3 and gm.status in ('active', 'inactive')) as plugged_in
	, max(coalesce(gm.journey_status, 0)) filter (where gm.status = 'pending' and coalesce(gm.journey_status, 0) < 3) as best_pending_stage
	, bool_and(gm.status = 'archived') as all_archived
	-- Someone can only be added after Attended, so these should be zero. Anything else is a data error.
	, count(*) filter (where gm.status in ('active', 'inactive') and gm.journey_status is distinct from 3) as data_errors
	, bool_or(gm.role = 'leader' and gm.status = 'active') as is_leader
	, bool_or(gm.status = 'active') as in_group_now
	from group_memberships gm
	group by gm.user_id
)
select m.user_id
, m.first_name
, m.last_name
, m.signed_up_at
, m.signed_up_at >= now() - interval '30 days' as is_new
, CASE WHEN m.newcomer THEN 'Newcomer' ELSE 'Existing member' END as congregation
, m.is_admin
, coalesce(p.is_leader, false) as is_leader
, coalesce(p.in_group_now, false) as in_group_now
, CASE WHEN p.user_id is null THEN 'No requests'
	WHEN p.connected THEN 'Connected'
	WHEN p.best_pending_stage is not null THEN 'Not yet connected'
	WHEN p.all_archived THEN 'Archived'
	ELSE 'Check data'
	END as outcome
, CASE WHEN p.user_id is null THEN 'No requests'
	WHEN p.connected THEN 'Connected'
	WHEN p.best_pending_stage = 2 THEN 'Spoken to'
	WHEN p.best_pending_stage = 1 THEN 'Reached out'
	WHEN p.best_pending_stage = 0 THEN 'Not contacted'
	WHEN p.all_archived THEN 'Archived'
	ELSE 'Check data'
	END as furthest_stage
, coalesce(p.connected, false) as connected
, coalesce(p.plugged_in, false) as plugged_in
, coalesce(p.memberships, 0) as requests
, coalesce(p.pending_memberships, 0) as pending_requests
, coalesce(p.data_errors, 0) as data_errors
, m.cannot_find_group_requested_at is not null
	and (m.cannot_find_group_resolved_at is null or m.cannot_find_group_resolved_at < m.cannot_find_group_requested_at)
	as needs_help
, CASE WHEN m.cannot_find_group_requested_at is null THEN null
	WHEN m.cannot_find_group_resolved_at >= m.cannot_find_group_requested_at THEN 'Resolved'
	WHEN m.cannot_find_group_contacted_at >= m.cannot_find_group_requested_at THEN 'Contacted'
	ELSE 'Not contacted'
	END as needs_help_state
, m.cannot_find_group as cannot_find_group_flag
from members m
left join by_person p on p.user_id = m.user_id
order by m.signed_up_at desc

-- For the connection bar, wrap the query above:
-- select outcome, furthest_stage, count(*) as people from ( <the query above> ) x group by 1, 2 order by 1, 2
