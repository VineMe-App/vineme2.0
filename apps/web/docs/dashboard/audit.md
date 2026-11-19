# Clergy dashboard: audit (AUD-1)

Taken on 29 October 2026, read-only. Nothing in the code or the database was changed.

- **Code:** the `staging` branch at `a83f4b3`, which is what the latest Vercel preview deploys. `main` has none of the dashboard pages yet, so `staging` is the dashboard clergy see.
- **Data:** church `fc3835b8-af9d-4303-bc5d-0daeec736e35`, service `52434036-c693-45ff-a79c-2b47220f879f` (6:30pm Evening Service), the scope in `reference/people.sql`. It's the church's only service.
- **Privacy:** the repo is public, so this file uses counts only for people and requests: no names, contact details, or user or membership IDs. Church, service and group IDs are used where needed.
- **Time:** follow-up states and "new in 30 days" depend on the clock, so they can move by one or two from day to day.

## The short version

- **The dashboard writes nothing.** Ticking a stage, adding a note, "Add to group" and "Archive" on Follow-ups only change what's on screen, and are lost on refresh. The only write in the whole dashboard is the admin's own bio on Profile.
- **Most numbers count something different from the glossary**, mainly because each page has its own rules and no page excludes test accounts. The biggest gaps: Members loads only the newest 500 people; Reports' "Attended" drops anyone who has since left or been archived; Follow-ups never flags Attended requests and adds a 30-day cap of its own.
- **Some data is invented.** The pet tags come from a hash of the group ID, and "Accessible" is hard-coded to one group's name.
- **Metabase reconciles exactly** with `people.sql` once three things are accounted for: 2 members with no last name, 2 people whose only request was to the closed group, and Metabase's case-sensitive test-account filter (which happens to make no difference today).
- **`reference/followed-up-in-time.sql` fails as committed**: it filters on `users.email`, which doesn't exist. With that line removed it runs.

## Today's reference figures

From `reference/people.sql` (people) and the glossary's request scope (requests to groups in the service, test accounts excluded):

| Figure | Today |
| --- | --- |
| Members | 560 |
| Requested | 266: Connected 184, Not yet connected 23 (Spoken to 15, Reached out 7, Not contacted 1), Archived 59 |
| No requests | 294 |
| Connected rate | 184 of 266 (69%) |
| Plugged in | 169 of 184 connected (92%) |
| In a group now | 149 |
| Leaders / admins | 34 / 3 |
| Newcomers | 436 |
| New (last 30 days) | 26 |
| Needs help | 11, all contacted, none resolved. 60 earlier requests are resolved. |
| Data errors (added or left without reaching Attended) | 0 |
| Requests | 333: added 159 (48%), pending 53 (16%), archived 97 (29%), left 24 (7%). 40 of them are leaders' own memberships. |
| Archived requests by reason | No longer interested 54, Not contactable 26, Not suitable for group 10, Group at capacity 5, none recorded 2 |

From `reference/follow-ups.sql`, the 53 pending requests:

| Stage | Needs first contact | On track | Needs attention | Total |
| --- | --- | --- | --- | --- |
| Not contacted | 7 | | 2 | 9 |
| Reached out | | 9 | 6 | 15 |
| Spoken to | | 5 | 17 | 22 |
| Attended, not yet added | | 5 | 2 | 7 |
| **Total** | **7** | **19** | **27** | **53** |

From `reference/followed-up-in-time.sql` (with the email line removed), by request quarter. Each cell is the percentage hit, with the number of requests judged:

| Quarter | Requests | Reached out within 6 days | Spoken to within 16 | Attended within 30 |
| --- | --- | --- | --- | --- |
| 2025 Q1 | 19 | 11% of 19 | 11% of 19 | 11% of 19 |
| 2025 Q2 | 49 | 76% of 49 | 76% of 49 | 76% of 49 |
| 2025 Q3 | 39 | 62% of 39 | 62% of 39 | 62% of 39 |
| 2025 Q4 | 49 | 31% of 49 | 31% of 49 | 31% of 49 |
| 2026 Q1 | 63 | 44% of 63 | 35% of 63 | 30% of 63 |
| 2026 Q2 | 33 | 55% of 33 | 45% of 33 | 33% of 33 |
| 2026 Q3 | 16 | 69% of 16 | 38% of 16 | 25% of 16 |
| 2026 Q4 (in progress) | 36 | 90% of 29 | 86% of 22 | 100% of 12 |

Stage changes have only been recorded since 7 January 2026 (the first `journey_status_change` note). Before that, 130 of 185 requests have no stage dates, so all three measures fall back to the date they were added, which is why the three columns match before 2026. Those quarters measure "added within N days", not each stage. 2024 quarters are left out above for the same reason.

## Metabase against people.sql

Metabase's two figures today, and what they reconcile to. Both questions were rebuilt from `follow-ups.sql` and reproduce Metabase's numbers exactly, segment by segment.

| | People | Requested | Connected / attended | Not yet connected | Archived | No requests |
| --- | --- | --- | --- | --- | --- | --- |
| `people.sql` | 560 | 266 | 184 | 23 (15 / 7 / 1) | 59 | 294 |
| Total Users donut | 558 | 266 (184 + 82) | 184 | 82 "requested" = 23 + 59 | | 292 "downloaded" |
| User-Requests bar | | 264 | 183 | 23 (15 / 7 / 1) | 58 | |

**Donut against people.sql (560 vs 558).** 2 members are in `people.sql` but not the donut. Both have no last name: Metabase filters with `last_name not like '%Test%'`, which drops a null; `people.sql` uses `coalesce`. Both have no requests, so "downloaded" is 292, not 294.

Metabase's test filter is case-sensitive (`'%Test%'`), and `people.sql`'s isn't. Today no one is caught by one and not the other.

**Bar against people.sql and the donut (264 vs 266).** 2 people who requested are missing from the bar. Their only request was to the closed group `097075b1-14a9-4392-919b-72cd4dd7f848`, which has no active leader, and the bar inner-joins to active leaders. 1 is Connected (their membership reached Attended and has since become `inactive`) and 1 is Archived (archived at Spoken to).

That's the whole difference: attended 183 vs 184 and archived 58 vs 59. The stages match.

**Two people outside every person count.** The bar only reproduces 264 if people are limited to the church and service, so Metabase must do that too. 2 people fall outside it:

- 1 has no church or service on their profile, but an active membership (stage 3) in a group here. Counted in request totals (the glossary scopes requests by the group), never in people.
- 1 has this service but a different `church_id`. Left out of `people.sql`, the dashboard and Metabase alike.

The user IDs behind these counts aren't recorded here because the repo is public. Rerun the comparison queries to get them.

## Every number on the dashboard

Every query runs in the browser as the signed-in admin, filters by `church_id`, and none excludes test accounts. "Glossary term" says what the number should become.

### Overview (`app/dashboard/page.tsx`, `fetchOverview` and `fetchFollowUps` in `lib/dashboard/queries.ts`)

| Label | Today | How it's worked out | Glossary term |
| --- | --- | --- | --- |
| Total users | 564 | `users` where `church_id` matches. No service filter and no test filter. | Members (560). The 4 extra are test accounts. |
| Pending follow-ups | 53 | `group_memberships` with `status = 'pending'`, in groups of the church | Pending requests (53) |
| Groups at capacity | 5 | `groups` with `status = 'approved'` and `at_capacity` | At capacity: 5 of 19. The closed group is also flagged `at_capacity`, but excluded. |
| Pending requests by group (chart) | 53 across 14 groups: Not contacted 9, Reached out 15, Spoken to 22, Attended 7 | The follow-ups query, counted by group title and `journey_status` | Pending requests by stage. Correct today. |
| User database (newest 5) | 3 "Pending follow-up", 2 "Looking for a group" | Newest 5 users; status as on Members | Outcome or Furthest stage |

### Follow-ups (`app/dashboard/follow-ups/page.tsx`, `fetchFollowUps`, `lib/dashboard/follow-up-utils.ts`)

| Label | Today | How it's worked out | Glossary term |
| --- | --- | --- | --- |
| Heading: "N people need a follow-up" | 29 | Same as Need attention. Counts requests but says "people". | Needs attention, in requests |
| Need attention | 29 | Pending, not at Attended, past the dashboard's due date (see below) | Needs attention: 27 (25 of these, plus 2 at Attended) |
| On track | 17 | Pending, not at Attended, not past due | On track 19 (10 of these, plus 4 the dashboard flags and 5 at Attended) and Needs first contact 7 |
| Attended, not yet added | 7 | `journey_status = 3`. Never flagged, however old. | Attended, not yet added: 7, of which 2 need attention |
| Status view sections | Not contacted 9, Reached out to 15, Spoken to 22, Attended 7 | By `journey_status` | Stages |
| Card badge "Overdue N days" / "Due in N days" | Per card | Days past or before the due date, not days waiting | Card wording ("No contact in 5 days") |
| Group leader view bar | Per leader | Overdue against everyone else, so Attended counts as "on track" | Follow-up states |

### Groups (`app/dashboard/groups/page.tsx`, `fetchGroups`, `GroupSheet.tsx`)

| Label | Today | How it's worked out | Glossary term |
| --- | --- | --- | --- |
| Groups shown | 19 | `status = 'approved'`, sorted by pending count ("busiest first") | Groups, closed left out |
| "N to follow up" badge | 14 groups have one, 53 in all (largest: 11, 8, 7, 6) | All pending requests to the group | Badge (needs attention, else pending) |
| Members | 159 across the 19 | Active memberships, leaders included | Members (of a group) |
| At capacity / Taking new members | 5 / 14 | `groups.at_capacity` | Correct |
| Led by | First active leader only | First `role = 'leader'` active membership found | Leaders (all of them) |
| Area | Full address on every card | `location.name`, which no group has, so it falls back to `location.address` | No area field exists |
| Map pins | 19 | `location.coordinates` | Correct |
| Drawer: Members (N) / Waiting to be followed up (N) | Per group | Active / pending memberships | Members (of a group) / Pending requests |

### Members (`app/dashboard/members/page.tsx`, `fetchMembers`, `MemberSheet.tsx`)

| Label | Today | How it's worked out | Glossary term |
| --- | --- | --- | --- |
| All members | 500 | Newest 500 users in the church (`.limit(500)`). The 64 oldest (signed up 12 Sept 2024 to 5 Jan 2025) never load. | Members (560) |
| Connected | 116 | Has an active membership | In a group now (149 across all members) |
| Pending follow-up | 29 | No active membership, at least one pending | None: people aren't pending. Closest is Not yet connected (23). |
| Looking for a group | 355 | Neither | None. Covers No requests (294) and Archived (59), plus anyone who has left. |
| New in 30 days | 26 | `created_at` within 30 days | New (26) |
| "X of 500 people" | 500 | Rows loaded, not the true total | Members |
| Search | Only the 500 loaded | Filters in the browser | Server-side search (QW-1) |
| Role | Admin 1, Group Leader 20 or 21, Congregation 478 or 479 | `church_admin` → Admin; else if the *first* active membership found is a leader → Group Leader. One person has two active memberships, so their role depends on row order. | Role (Admin, Leader, Newcomer, Existing member) |
| Group | First active, else first pending | Row order isn't defined, so it can vary for anyone in two groups | Groups |
| Drawer: "New to church" | From `users.newcomer` | | Newcomer, which doesn't mean new to church |
| Drawer: groups list | Active and pending only | Archived and left requests are hidden | Every request (MEM-3) |

### Reports (`app/dashboard/reports/page.tsx`, `fetchReports`, `ReportsBoard.tsx`)

Reports counts people from the whole church (564), with memberships in the church's groups.

| Tab and label | Today | How it's worked out | Glossary term |
| --- | --- | --- | --- |
| Downloads: Attended | 155 (27%) | An active membership, or a pending one at stage 3 | Connected (184). The 29 missing left (20) or were archived (9) after attending. |
| Downloads: Requested | 23 (4%) | A pending request, not "Attended" | Not yet connected (23) |
| Downloads: Downloaded | 386 (68%) | Everyone else | None. 294 No requests + 59 Archived + 29 connected who left or were archived + 4 test accounts. There is no download event. |
| Downloads: Newcomers filter | 90 / 23 / 326 (439) | Same, newcomers only | |
| People by the month they joined | May 13, Jun 5, Jul 4, Aug 2, Sep 12, Oct 25 | `created_at` month (UTC), last 6 months | Signed up |
| Pipeline: Pending requests by stage | Not contacted 1, Reached out 9, Invited 17, Attended 7 (34 people) | People with a pending request, by their furthest pending stage. Counted in people, titled "requests". | Not yet connected by stage (15 / 7 / 1), or pending requests by stage |
| Groups: Members by group | 19 groups, 159 members, 53 waiting | Active / pending memberships | Members (of a group) |
| Team: Open follow-ups | Needs your attention 22, On track 5, Attended, not yet added 7 (34 "Open") | People, not requests, timed from their *earliest* pending request date, not the stage date | Follow-up states (27 / 19 / 7 requests) |
| Newcomers | Newcomer 439, Not a newcomer 125 | `users.newcomer` | Newcomer (436) |
| Newcomers: who joined | May 13 (11 newcomers), Jun 5 (2), Jul 4 (4), Aug 2 (2), Sep 12 (11), Oct 25 (19) | By signup month | |
| Connection: In a group | 155 | Same as "Attended" above | Connected (184), or In a group now (149) |
| Connection: Asked for help | 11 | `cannot_find_group` and not "Attended" | Needs help (11) |
| Connection: Not connected | 398 | Everyone else | None |

### Settings and Profile

- **Settings:** "Not connected" is hard-coded. It happens to be true: `churchsuite_connections` has no row for this church. The form submits nothing.
- **Profile:** church, service and "member since" come from the admin's own row. Editing the bio is the dashboard's only write.

## Hard-coded, guessed or not backed by a column

- **Pet friendly / Pet free tags** (`GroupTraits.tsx`): a hash of the group ID decides which groups show them. There's no pet field.
- **"Accessible" tag:** hard-coded to the group whose title is "South Kensington Connect". There's no accessibility field.
- **Area on group cards:** no group has `location.name`, so cards show the full address.
- **Archive reasons in the follow-up drawer:** a hard-coded list ("Not contactable", "Not interested", "Moved away", "Joined another group", "Other") that doesn't match the reasons the app saves, and isn't saved anyway.
- **"Referred by":** the drawer has a line for it, but the query never fills it. 20 requests in this service have a `referral_id`.
- **Phone number:** a blank placeholder until `get_user_contact_admin` returns it. That function also returns the email, which the dashboard ignores.
- **"Ticking a box saves straight away"** (follow-up drawer): untrue. Nothing saves.
- **"Changes you make here are not saved yet" and "press Review"** (Follow-ups intro): the first is true; the button is labelled "View".
- **"Your next digest arrives Monday."** (Follow-ups footer): hard-coded. Nothing in this repo sends a digest.
- **"Invite user"** (Overview): does nothing.
- **Stage dates shown as "earlier"** when no note records them.
- **"Downloaded":** the code itself notes there's no download event. It means signed up.

## Follow-up logic against reference/follow-ups.sql

| | Dashboard (`fetchFollowUps`) | `follow-ups.sql` |
| --- | --- | --- |
| Scope | Groups by `church_id` | Groups by `service_id` (the same today) |
| Groups with no active leader | Included, under "No leader yet" | Dropped by an inner join (no pending requests affected today) |
| Test accounts | Not excluded | Excluded by a case-sensitive name match (no pending requests affected today) |
| Stage date | The *latest* note reaching the stage, with no undo guard | The *first*, ignoring taps undone within an hour |
| What resets the clock | Only reaching the stage (else the last stage change, else the request) | Any stage move forward, status change or leader's note |
| Leader notes | Ignored by the clock | Reset it |
| 30-day cap | Every due date is capped at request + 30 days | No such cap |
| Attended | Never flagged | Flagged after 30 days without action |
| Not contacted, 6 days or fewer | "On track" | "Needs first contact" |
| Days | 24-hour periods since the timestamp | Calendar days |
| Card number | Days past the due date | Days since the request or last action |
| Row limits | 200 requests, 2,000 notes (53 and 566 today, so no effect) | None |

Request by request today, 34 of 53 agree. The other 19:

- **7 Needs first contact shown as On track:** all Not contacted, 1 to 4 days since the request.
- **2 On track shown as Need attention because a leader's note is ignored:** both Reached out, with a leader's note 10 days ago.
- **2 On track shown as Need attention by the 30-day cap:** 1 Reached out (37 days since the request) and 1 Spoken to (49 days).
- **7 Attended, not yet added, never flagged.** Of these, 2 need attention (176 days since the last action) and 5 are on track.

## The known gaps, explained with today's numbers

- **Total people: Overview 564, Metabase 558, Members 500** (`people.sql`: 560). Overview counts every user in the church: 560 members plus 4 test accounts. Metabase drops the 4 test accounts and the 2 members with no last name. Members stops at the newest 500.
- **Connected: Members 116, Reports 155, Metabase 184** (`people.sql`: 184). Metabase and `people.sql` agree: someone who ever reached Attended. Reports counts only people still in a group or pending at Attended (149 + 6), dropping 20 who left and 9 archived after attending. Members counts people in a group now (149 in the church), but only among the newest 500, which leaves 116.
- **Requested: Reports 23 against Metabase 82.** Reports' "Requested" is people with a pending request who haven't attended: the glossary's Not yet connected (23). Metabase's 82 adds the 59 whose requests were all archived.
- **Pending: Members 29 (people) against Overview 53 (requests).** 34 people have a pending request, and 5 of them are also in a group, so Members shows them as Connected, leaving 29. Overview counts requests. Under the glossary, pending only describes requests.
- **Need attention 29 + on track 17 = 46**, exactly everyone before Attended. The dashboard never flags Attended, so 2 requests past 30 days are missed. It also counts 7 requests awaiting first contact as on track, and adds 4 the reference doesn't flag (above).
- **Follow-up cards count days past the limit.** For Not contacted, "Overdue N days" is the days since the request minus 7: the 6-day limit, plus rounding down. For other stages, it's days past the stage date plus the limit, or past request + 30 days, whichever is earlier.
- **May sign-ups: 13 on the dashboard, 10 in Metabase.** Three test accounts signed up on 28 May, and only Metabase excludes them. February differs too (41 against 40, one test account), but Reports only shows the last 6 months.
- **"Invited" against "Spoken to":** the follow-up drawer's steps, the stepper, the progress label and the Reports Pipeline tab say "Invited". The Follow-ups page and the Overview chart say "Spoken to".
- **The Follow-ups intro and the drawer contradict each other, and neither is right in full.** The intro says changes aren't saved (true) and mentions a "Review" button (it's "View"). The drawer says ticking saves straight away (false).

## Data questions

1. **Does `church_admin` access show the whole church or one service?** The whole church for people, requests and groups: every query filters by `users.church_id` or `groups.church_id`, and RLS allows those reads. Notes are the exception: RLS lets an admin read `group_membership_notes` only for groups in their own `service_id`. With one service, the two match today. A superadmin can switch between churches.
2. **Where are needs-help requests stored?** On `users`: `cannot_find_group` (flag), `cannot_find_group_requested_at`, `_contacted_at` and `_resolved_at`. The data answers MEM-4's check in part: all 60 resolved requests have the flag set back to false, and all 11 contacted-but-unresolved ones are still true. What happens when someone asks again needs the app code.
3. **How is group status stored?** `groups.status`, a text column limited to `pending`, `approved`, `denied` or `closed`. New groups default to `pending`. Today this service has 19 `approved` and 1 `closed` (`097075b1-14a9-4392-919b-72cd4dd7f848`), and Olly confirmed that's the group that's closed in real life, so the at-capacity count of 5 is right. The closed group is still flagged `at_capacity`; that doesn't matter, because closed groups never count as at capacity (see the glossary). Pending approval already exists in the data model.
4. **Do notes record who made each change, and in what role?** Who: yes, `group_membership_notes.created_by_user_id`, always filled. In what role: no. Inferring it, 710 of 761 notes in this service were made by someone who was, at some point, a leader of that group; 4 archives were made by a church admin who isn't a leader there. 47 were made by 4 people who are neither (possibly leaders whose leader membership has since been removed). DEV-7 is needed to record the role.
5. **Where are archive reasons defined?** Saved as free text in `group_membership_notes.reason`, on the `request_archived` note. There's no enum or check constraint, so the list lives in the app's code, not in this repo. Values in use: the four in the glossary. The dashboard's own list doesn't match.
6. **Can the confirmed email and `auth.users.email_change` be read on the server?** Yes. `get_user_contact_admin` is `SECURITY DEFINER` and already reads `auth.users.email` (and `phone`) for church admins of the person's church. It doesn't return `email_change`, but the same function could. The site also has a server-only service-role key (used by `app/api/contact`), which can read both through the admin API. The audit login can't see the `auth` schema, so how many emails are unconfirmed wasn't checked.
7. **When clergy tick a stage, is a note written as the app does?** No: nothing is written at all. And no database trigger writes notes; the app writes each `journey_status_change` note itself. Any dashboard change will have to write the note too (FU-4).
8. **Does the drawer's "Add a note" save anything?** No. It only adds to the list on screen. No clergy notes exist, so none are resetting the clock.

## Glossary check

Checked against the code and database. These need correcting or adding:

1. **Test account: "or email"** can't be applied: `users` has no email column (email is in `auth.users`). `people.sql` already comments it out; `followed-up-in-time.sql` doesn't, and fails.
2. **Group status:** stored in `groups.status`. "Active" is `approved`. Pending approval isn't "to come": `pending` (the default) and `denied` already exist.
3. **Closed groups** need their own rule. This audit adds it: `groups.status = 'closed'`, left out of every group count and filter.
4. **Stage date:** only exists from 7 January 2026. Most earlier requests have none.
5. **Every request goes through the journey:** the database enforces stage 3 for `active` (constraint `group_memberships_active_requires_attended`) but not for `inactive`. There are no exceptions today.
6. **Last action, "a leader's note (`note_type` `manual`)":** `manual` isn't limited to leaders. 22 of 106 manual notes in this service were written by people who aren't leaders of that group.
7. **Leader:** `group_memberships.role` also allows `admin`. None exist in this service, but the code treats `admin` as a leader in places.
8. **Needs help, "Check (MEM-4)":** resolving does set `cannot_find_group` back to false (see data question 2).
9. **Scope:** two people sit outside the person scope but inside the request scope or the service (see "Two people outside every person count").

Everything else matches: `users.church_id`, `service_id`, `roles` (a text array), `created_at` and `newcomer`; `journey_status` empty, 1, 2 or 3; statuses `pending`, `active`, `inactive` and `archived`; the four archive reasons; `groups.at_capacity`; the `cannot_find_group` columns; and the 6, 10, 14 and 30-day limits.
