# VineMe clergy dashboard: glossary

This file is the contract for the clergy dashboard. Every page, query, Metabase question and label follows it. If a definition needs to change, change it here first, then in the code. Every label shown on screen comes from one terms file in the code (QW-9), so renaming a term means changing it here and in that file, nowhere else.

The facts here (tables, columns, status values and time limits) come from the reference SQL and the Metabase dashboard as of 22 October 2026. The recommendations were drafted with Claude and are marked. Decisions already made are recorded in `decisions/`.

Lines marked **Decision needed** are recommendations waiting for sign-off. The matching decision issue is named beside each one. Until it's decided, don't build on it: if a task depends on one, stop and ask. Once it's decided, replace the marker with the decision. Lines marked **Check** are facts to confirm in the code. They don't block work.

## Rules for anyone working on the dashboard

1. **Use these words exactly, with no synonyms as labels.** "Overdue", "Due in", "To follow up", "Waiting", "Invited", "Joined" and "Looking for a group" are currently used as labels for ideas defined below; replace them. Plain phrases on cards, like "No contact in 5 days" or "Reached out 2 days ago", are fine.
2. **Every number says what it counts.** People or requests: "30 people, 46 requests", never just "46".
3. **Calculate once.** Once the request and person views exist (DATA-1 and DATA-2), numbers come from them, not from new calculations in components. Until then, don't add number calculations beyond what an issue asks for.
4. **Now pages and an over-time page.** Overview, Follow-ups, Groups and Members show the current state. Insights shows change over time. Each number has one home, and other pages link to it.
5. **Red and green only mean needs attention and on track.** Stage colours are distinct from each other, but never red or green.
6. **Never show data the database doesn't hold.** No placeholders and no invented fields. If something isn't stored, say so.
7. **Plain, warm words.** Avoid pipeline, performance, effectiveness, workflow, onboarding, optimise and streamline. Headings work best as plain questions, like "How quickly are we following up?"
8. **Mark the current period as in progress.** This week, month or quarter hasn't finished, so it can't be compared like for like.
9. **Small numbers get their count.** Every percentage shows the count it's based on. Groups with fewer than 5 requests in a period are greyed out in comparisons (a recommended threshold, open to change).
10. **Charts invite exploring.** Hovering shows the numbers behind a mark, clicking drills in, and views animate when they change rather than jumping.

## Scope

- **People** belong to the dashboard's church and service when `users.church_id` and `users.service_id` match. All their memberships count, in any group, open or closed, so a person's history doesn't vanish when a group closes.
- **Requests** belong to the service of the group they were made to (`groups.service_id`). Follow-ups and the Team measures use this.
- Only one service uses VineMe today, so the two rarely differ. Church-wide and per-service views come with DEV-9.
- A few profiles don't fit. Someone with no church or service can still have requests to a group here (counted in requests, not people), and someone can have this service but another church's `church_id` (counted in neither). AUD-1 found one of each.

## People

| Term | Meaning |
| --- | --- |
| Member | Everyone in scope, leaders and admins included, test accounts excluded. |
| Admin | A member whose `users.roles` includes `church_admin`. |
| Leader | A member with an active leader membership (`group_memberships.role = 'leader'`, status `active`). The `role` column also allows `admin`, which the code treats like a leader. There are none today. |
| Test account | First name or last name containing "test", in any case. Email can't be used, because `users` has no email column (email lives in `auth.users`). A proper flag would be safer (DEV-11). |
| Signed up | When the person created their account (`users.created_at`). Replaces "Joined" and "Downloaded" as labels. |
| New | Signed up in the last 30 days. Worked out from Signed up; nothing in the database stores it. |
| Newcomer | Said during onboarding that they're looking for a group (`users.newcomer`). It doesn't mean new to church. It separates people using VineMe to find a group from existing members recording a group they're already in. Everyone else is an Existing member. |
| Role | Admin, Leader, Newcomer or Existing member. |

## Requests

| Term | Meaning |
| --- | --- |
| Request | One person's membership of one group (a `group_memberships` row). Everyone starts by asking to join, so it's called a request. A person can have several. |
| Stage | Where a pending request has got to: Not contacted (`journey_status` empty), Reached out (1), Spoken to (2), Attended (3). Stage 2 is always "Spoken to"; the follow-up drawer's "Invited" goes. |
| Stage date | When a request first reached its current stage, from `group_membership_notes`. Taps undone within an hour are ignored, as in `reference/follow-ups.sql`. Stage changes have only been recorded since 7 January 2026, so most earlier requests have no stage dates. |
| Pending | Not yet resolved (`status = 'pending'`). Attended is still pending. |
| Added | The leader added them to the group (status `active`). |
| Left | Was added and has since left (status `inactive`). |
| Archived | Closed with a reason (status `archived`). |
| Resolved | Added or Archived. |
| Archive reasons | No longer interested, Not contactable, Not suitable for group, Group at capacity, and any others where the app defines them. Read the list from that definition; never keep a second copy. |
| Last action | The latest of: a stage moving forward (by a leader or clergy), a status change, a leader's note (`note_type` `manual`; the type doesn't prove who wrote it, since some manual notes come from people who aren't leaders of that group, and DEV-7 records who and in what role), or a clergy note marked "spoken to them". Other clergy notes don't count, so a note alone can't make an untouched request look on track. Counted in calendar days. |
| Clergy note | A note added by clergy in the dashboard (FU-6), stored with its own note type so it never counts as a leader's note. It can be marked "spoken to them", which resets the clock without changing the stage. |

## Outcomes: who got connected

Pending and Connected live at different levels, which is what makes this subtle:

- **Pending** only ever describes a request. A request isn't finished until the leader adds the person or it's archived, so an attended request is still pending.
- **Connected** only ever describes a person. They're connected the moment one of their requests reaches Attended, whatever happens to that request afterwards.

So a person can be connected while their request is still pending, because the leader hasn't added them yet. That's expected, not a contradiction. Never call a person pending.

Everyone who has requested falls into exactly one of these, decided by their best request:

| Outcome | Meaning |
| --- | --- |
| Connected | At least one membership at Attended (`journey_status` 3), whatever its status now: pending, added, left or archived. |
| Not yet connected | Not connected, and at least one request still pending, at Spoken to, Reached out or Not contacted. |
| Archived | Not connected, and every request archived. |

These add up to everyone who has requested. Members who have never made a request are **No requests**. The connection bar on Insights shows the first three, with Not yet connected split into its stages.

Other person-level terms:

- **Requested:** has made at least one request.
- **Furthest stage:** the outcome with Not yet connected split into its stages: Connected, Spoken to, Reached out, Not contacted, Archived or No requests.
- **Plugged in:** a connected person who was then added to the group, even if they've since left. It's a measure, not a separate group: every plugged-in person is also connected.
- **In a group now:** has an active membership today, as a member or a leader. This is a state, not a VineMe outcome. Group member counts use it.

Every request goes through the journey: the app only lets a leader add someone once they've reached Attended. So an added or left request should always be at stage 3. The database enforces this for added requests (the constraint `group_memberships_active_requires_attended`) but not for left ones. `reference/people.sql` counts anything else as a data error.

`reference/people.sql` is the reference query for all of these. It uses each request's current stage.

## Needs help

| Term | Meaning |
| --- | --- |
| Needs help | The person pressed "I can't find a group" in the app (`users.cannot_find_group`, with `cannot_find_group_requested_at`) and it hasn't been resolved. Only clergy see these. |
| Contacted | Someone has marked them contacted (`cannot_find_group_contacted_at`), but it isn't resolved yet. |
| Resolved | Marked resolved (`cannot_find_group_resolved_at`). They drop off the list. |

Resolving sets `cannot_find_group` back to false: in October 2026, all 60 resolved requests had it off and all 11 open ones had it on. **Check (MEM-4):** in the app code, what happens if someone asks again. Until then, a request made after the last resolution counts as open again.

## Follow-up states and time limits

Every pending request has a limit for its current stage. Once more than that many days have passed, it needs attention.

| Stage | Limit | Counted from |
| --- | --- | --- |
| Not contacted | 6 days | the request |
| Reached out | 10 days | the last action |
| Spoken to | 14 days | the last action |
| Attended, not yet added | 30 days | the last action |

Not contacted always counts from the request. Only first contact (moving to Reached out or beyond) stops that clock, so notes don't reset it.

Every pending request is in one of three follow-up states, which add up to all pending requests:

| Follow-up state | Meaning | Colour |
| --- | --- | --- |
| Needs first contact | Not contacted, and 6 days or fewer since the request. | Neutral |
| On track | Contacted, and within its stage's limit. | Green |
| Needs attention | Past its stage's limit, at any stage. | Red |

**Attended, not yet added** is also shown as its own count, because the job is different: the leader adding them. Those past 30 days are already in Needs attention.

`reference/follow-ups.sql` holds the agreed logic, in its `follow_up` column.

**Card wording.** Cards say what happened and when, in plain words, and never count days past a limit:

- Not contacted: "No contact in 5 days", counted from the request ("Requested today" on the first day)
- Reached out: "Reached out today", "Reached out yesterday", "Reached out 3 days ago"
- Spoken to and Attended: the same pattern

The time comes from the stage date. If a later note or contact has reset the clock, the card adds it: "Reached out 12 days ago, updated 3 days ago". Cards don't say when the next contact is due; the page shows each stage's limit instead.

## Measures on Insights

**Insights** is the page that used to be called Reports. Metabase was the reference while the dashboard was built, but it's being retired, so where these definitions improve on a Metabase measure, the dashboard doesn't have to match it.

**Followed up in time** (the Team tab). Measured from the request date, using the same limits added up:

- Reached out within 6 days
- Spoken to within 16 days (6 + 10)
- Attended within 30 days (6 + 10 + 14)

A request only counts towards a measure once its result is known:

| What's happened to the request | Counts? | Result |
| --- | --- | --- |
| Reached the stage within the limit | Yes | Hit |
| Reached the stage after the limit | Yes | Miss |
| Archived before reaching the stage, for any reason | Yes | Miss |
| Past the limit without reaching the stage | Yes | Miss |
| Still open, within the limit, stage not reached | No | Not known yet |

So someone archived at Reached out is a miss for Spoken to and Attended, and someone still at Reached out isn't judged on Attended until day 30. If a stage is skipped, the later stage counts for the earlier ones: going straight to Attended counts as reached out and spoken to on that date. Each measure shows how many requests it's based on, and the current period is marked in progress. Year-on-year comparisons are shown in points: "58% (73% last year)".

`reference/followed-up-in-time.sql` holds the logic. The Team tab has an info button that shows the table above.

Stage dates only exist from 7 January 2026, when the app started recording stage changes, so the Team tab starts from Q1 2026. Most earlier requests have no stage dates, and the measures can't be worked out for them.

This answers a different question from needs attention. Needs attention asks "is this request slipping right now?" Followed up in time asks "how quickly did we get people through?" Never use one name for both.

**Connected rate** (the Results tab headline). Of people who requested, the share who are connected, counted in people, not requests. On 22 October 2026 that was 182 of 259 (70%).

**Plugged-in rate** (the Results tab). Of people who are connected, the share who were added to a group, including those who've since left.

**Resolved this week** (Overview). Requests that were added or archived this week. Attended doesn't count, because it's still pending.

## Groups

| Term | Meaning |
| --- | --- |
| At capacity / Taking new members | From `groups.at_capacity`, set by the leader. |
| Closed groups | A group is closed when `groups.status = 'closed'`. Left out of every group count and filter, including the total, At capacity and Taking new members. A closed group never counts as at capacity, whatever its `at_capacity` flag says. They only appear in the Closed view (GRP-3). |
| Group status | Stored in `groups.status`: `approved` (shown as Active), `closed`, `pending` or `denied`. `pending` (awaiting approval) is the default for a new group, so pending approval already exists in the data; DEV-3 builds the approval flow. |
| Leaders | Every active leader of the group, not just the first. |
| Badge | On a group card: how many of its requests need attention, in red. If none do but some are pending, the pending count in a neutral colour. Groups are listed with the most needing attention first, on Groups and on Follow-ups. |
| Members (of a group) | People in the group now: active memberships, leaders included. |

## Colours

| Meaning | Colour |
| --- | --- |
| Needs attention | Red |
| On track | Green |
| Needs first contact | Neutral, neither red nor green |
| Stages: Not contacted, Reached out, Spoken to, Attended | Four clearly distinct colours, none of them red or green |

Exact values come from the chart palette (DEV-10), stored as tokens alongside the brand colours. Never hard-code a chart colour.
