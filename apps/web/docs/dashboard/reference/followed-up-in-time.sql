-- Followed up in time: the three Team measures, using the counting rule agreed in DEC-3 (docs/dashboard/glossary.md).
-- One row per request. Each measure is 'Hit', 'Miss', or null when the result isn't known yet.
-- A result is known once the request reaches the stage, is archived before reaching it, or passes the limit.
-- Limits are counted from the request date: reached out within 6 days, spoken to within 16, attended within 30.
-- Stage dates use the one-hour undo guard from follow-ups.sql. A skipped stage takes the date of the later stage.

with journey_taps as (
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
, requests as (
	select gm.id as request_id
	, g.title as group_
	, gm.created_at ::date as requested_on
	, gm.status
	, COALESCE(jm.first_reached_at, jm.first_spoken_at, jm.first_attended_at, gm.joined_at) ::date as reached_out_on
	, COALESCE(jm.first_spoken_at, jm.first_attended_at, gm.joined_at) ::date as spoken_to_on
	, COALESCE(jm.first_attended_at, gm.joined_at) ::date as attended_on
	from group_memberships gm
	inner join groups g on g.id = gm.group_id
	inner join users u on u.id = gm.user_id
	left join journey_milestones jm on jm.membership_id = gm.id
	where g.service_id = '52434036-c693-45ff-a79c-2b47220f879f'
	and coalesce(u.first_name, '') not ilike '%test%'
	and coalesce(u.last_name, '') not ilike '%test%'
)
select request_id
, group_
, requested_on
, date_trunc('quarter', requested_on) ::date as request_quarter
, status
, reached_out_on
, spoken_to_on
, attended_on
, CASE WHEN reached_out_on is not null THEN CASE WHEN reached_out_on - requested_on <= 6 THEN 'Hit' ELSE 'Miss' END
	WHEN status = 'archived' THEN 'Miss'
	WHEN CURRENT_DATE - requested_on > 6 THEN 'Miss'
	END as reached_out_in_time
, CASE WHEN spoken_to_on is not null THEN CASE WHEN spoken_to_on - requested_on <= 16 THEN 'Hit' ELSE 'Miss' END
	WHEN status = 'archived' THEN 'Miss'
	WHEN CURRENT_DATE - requested_on > 16 THEN 'Miss'
	END as spoken_to_in_time
, CASE WHEN attended_on is not null THEN CASE WHEN attended_on - requested_on <= 30 THEN 'Hit' ELSE 'Miss' END
	WHEN status = 'archived' THEN 'Miss'
	WHEN CURRENT_DATE - requested_on > 30 THEN 'Miss'
	END as attended_in_time
from requests
order by requested_on desc

-- For the Team tab, wrap the query above, for example:
-- select request_quarter
-- , count(*) filter (where reached_out_in_time is not null) as reached_out_judged
-- , round(100.0 * count(*) filter (where reached_out_in_time = 'Hit') / nullif(count(*) filter (where reached_out_in_time is not null), 0)) as reached_out_pct
-- , count(*) filter (where spoken_to_in_time is not null) as spoken_to_judged
-- , round(100.0 * count(*) filter (where spoken_to_in_time = 'Hit') / nullif(count(*) filter (where spoken_to_in_time is not null), 0)) as spoken_to_pct
-- , count(*) filter (where attended_in_time is not null) as attended_judged
-- , round(100.0 * count(*) filter (where attended_in_time = 'Hit') / nullif(count(*) filter (where attended_in_time is not null), 0)) as attended_pct
-- from ( <the query above> ) x
-- group by 1 order by 1
