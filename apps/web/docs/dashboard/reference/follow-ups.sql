-- Reference: the Metabase follow-up detail query (6:30pm Evening Service), as of 22 October 2026.
-- Used by AUD-1 (the audit) and DATA-1 (the request view).
-- The follow_up column holds the follow-up rules agreed in DEC-2, with the glossary's labels
-- (Metabase calls them Attention, Actioned and Needs Reach Out).
-- Known issues in the rest, kept as written:
--   * the inner join to active leaders drops requests to groups with no active leader
--   * test accounts are excluded by name match (LIKE is case-sensitive)
-- docs/dashboard/glossary.md takes precedence.

with latest_note as (
	select membership_id
	, note_text
	, created_at
	, row_number() over (partition by membership_id order by created_at desc) as record
	from group_membership_notes
	where note_type = 'manual'
)
, journey_taps as (
	select membership_id
	, created_at
	, new_journey_status
	, lead(new_journey_status) over (partition by membership_id order by created_at) as next_journey
	, lead(created_at) over (partition by membership_id order by created_at) as next_at
	from group_membership_notes
	where new_journey_status is not null
)
, journey_milestones as (
	select membership_id
	, min(created_at) filter (where new_journey_status = 1) as first_reached_at
	, min(created_at) filter (where new_journey_status = 2) as first_spoken_at
	, min(created_at) filter (where new_journey_status = 3) as first_attended_at
	from journey_taps
	where next_journey is null
	   or next_journey >= new_journey_status
	   or next_at - created_at >= interval '1 hour'
	group by membership_id
)
, action_notes as (
	select membership_id
	, created_at
	, min(case when new_status = 'active' then created_at end) over (partition by membership_id) as first_activated_at
	from group_membership_notes
	where note_type = 'manual' -- leaders' notes. Clergy notes marked "spoken to them" join this list once FU-6 adds them; plain clergy notes never do
	   or new_journey_status > coalesce(previous_journey_status, 0)
	   or new_status is distinct from previous_status
)
, action_days as (
	select membership_id
	, created_at ::date as action_date
	, max(first_activated_at) as first_activated_at
	, row_number() over (partition by membership_id order by created_at ::date desc) as action_record
	from action_notes
	group by membership_id, created_at ::date
)
select users.first_name
, users.last_name
, users.created_at as downloaded_on
, gm.created_at as request_on
, g.title as group_
, CASE WHEN g.at_capacity = FALSE THEN 'Open' ELSE 'At Capacity' END as group_status
, string_agg(distinct u2.name, ',') as leaders
, gm.status
, CASE WHEN gm.journey_status is NULL THEN 'Not contacted'
	WHEN gm.journey_status = 1 THEN 'Reached out'
	WHEN gm.journey_status = 2 THEN 'Spoken to'
	WHEN gm.journey_status = 3 THEN 'Attended'
	END as pending
, CASE WHEN gm.status = 'archived' THEN a.action_date - gm.created_at ::date
	WHEN gm.status in ('active','inactive') THEN COALESCE(gm.joined_at, a.first_activated_at) ::date - gm.created_at ::date
	ELSE CURRENT_DATE - COALESCE(a.action_date, gm.created_at ::date) END as days_waiting -- Not contacted cards count from the request, as follow_up does, not from this
, a.action_date as last_action_on
, CASE WHEN gm.journey_status = 3 AND CURRENT_DATE - COALESCE(a.action_date, gm.created_at ::date) > 30 AND gm.status = 'pending' THEN 'Needs attention'
	WHEN gm.journey_status = 2 AND CURRENT_DATE - COALESCE(a.action_date, gm.created_at ::date) > 14 AND gm.status = 'pending' THEN 'Needs attention'
	WHEN gm.journey_status = 1 AND CURRENT_DATE - COALESCE(a.action_date, gm.created_at ::date) > 10 AND gm.status = 'pending' THEN 'Needs attention'
	WHEN gm.journey_status is null AND CURRENT_DATE - gm.created_at ::date > 6 AND gm.status = 'pending' THEN 'Needs attention'
	WHEN gm.journey_status is not null AND gm.status = 'pending' THEN 'On track'
	WHEN gm.status = 'pending' THEN 'Needs first contact'
	END as follow_up -- empty for requests that are added, left or archived
, CASE WHEN gm.journey_status = 3 AND jm.first_spoken_at is not null THEN 'Spoken to'
	WHEN gm.journey_status in (2,3) AND jm.first_reached_at is not null THEN 'Reached out'
	WHEN gm.journey_status is not null THEN 'Requested'
	END as previous_action
, CASE WHEN gm.journey_status = 3 THEN jm.first_attended_at ::date - COALESCE(jm.first_spoken_at, jm.first_reached_at, gm.created_at) ::date
	WHEN gm.journey_status = 2 THEN jm.first_spoken_at ::date - COALESCE(jm.first_reached_at, gm.created_at) ::date
	WHEN gm.journey_status = 1 THEN jm.first_reached_at ::date - gm.created_at ::date
	END as days_to_action
, CASE WHEN gm.journey_status = 3 THEN COALESCE(jm.first_spoken_at, jm.first_reached_at, gm.created_at)
	WHEN gm.journey_status = 2 THEN COALESCE(jm.first_reached_at, gm.created_at)
	WHEN gm.journey_status = 1 THEN gm.created_at
	END ::date as previous_action_on
, gm.created_at as requested_on
, jm.first_reached_at as reached_out_on
, COALESCE(jm.first_reached_at,jm.first_spoken_at,jm.first_attended_at,gm.joined_at) ::date - gm.created_at ::date as days_to_reach_out
, jm.first_spoken_at as spoken_to_on
, COALESCE(jm.first_spoken_at,jm.first_attended_at,gm.joined_at) ::date - gm.created_at ::date as days_to_spoken_to
, jm.first_attended_at as attended_on
, COALESCE(jm.first_attended_at,gm.joined_at) ::date - gm.created_at ::date as days_to_attended
, gm.joined_at :: date
, ln.note_text as note
, ln.created_at as note_creation
, CASE WHEN users.newcomer = true THEN 'Newcomer' ELSE 'Existing Member' END as congregation
, users.id
from users
inner join group_memberships gm on gm.user_id = users.id
inner join groups g on g.id = gm.group_id
inner join group_memberships l on l.group_id = gm.group_id and l.role = 'leader' and l.status = 'active'
inner join users u2 on u2.id = l.user_id
left join action_days a on a.membership_id = gm.id and a.action_record = 1
left join journey_milestones jm on jm.membership_id = gm.id
left join latest_note ln on ln.membership_id = gm.id and ln.record = 1
where 1=1
and users.first_name not like '%Test%'
and users.last_name not like '%Test%'
and g.service_id = '52434036-c693-45ff-a79c-2b47220f879f'

-- and gm.status = 'pending'
-- and users.newcomer = true
-- and (users.id = 'a30c41d9-911e-44c4-847d-86f0723468e8' or users.id = '849c9514-6d85-410f-9da4-8756f60d9702')
group by 1,2,3,4,5,6,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27
order by pending