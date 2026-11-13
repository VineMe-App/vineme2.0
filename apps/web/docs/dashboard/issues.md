# Clergy dashboard: GitHub issues

62 issues, in working order. Each `###` entry below becomes one GitHub issue:

- **Title:** the heading text after `### `, key included (for example `DATA-1 · Request view: one row per request, with stage and time limits`).
- **Labels and milestone:** the lines under the heading.
- **Body:** everything after the `**Body**` line, up to the next `---`.

Create them in the order listed, so issue numbers run in working order. Keys like DATA-1 are for cross-references. Once the issues exist, put each issue's number on its `Number:` line, and add the number wherever a body mentions another key, for example "DATA-1 (#12)".

Definitions live in `docs/dashboard/glossary.md`. The reference query is `docs/dashboard/reference/follow-ups.sql`.

## Labels

| Label | Colour | Description |
| --- | --- | --- |
| dashboard | 5319e7 | Clergy dashboard work |
| decision | fbca04 | A choice to make before the work it blocks |
| bug | d73a4a | Something isn't working |
| data | 0e8a16 | Database views, queries or Metabase |
| needs-dev | 8250df | Needs app or backend work beyond the dashboard |
| design | d4c5f9 | Visual design work, such as colours |
| overview | c5def5 | Overview page |
| follow-ups | c5def5 | Follow-ups page |
| groups | c5def5 | Groups page |
| members | c5def5 | Members page |
| insights | c5def5 | Insights page (was Reports) |
| settings | c5def5 | Settings page |
| shared | c5def5 | Shared components, or several pages at once |
| size:S | ededed | Under an hour |
| size:M | ededed | A session of 2 to 3 hours |
| size:L | ededed | More than one session |

## Milestones, in order

1. `1. Decide and audit`
2. `2. Quick wins and bugs`
3. `3. Data foundations`
4. `4. Pages`
5. `5. Polish`
6. `6. Dev backlog`

---

### DEC-1 · Agree the core definitions

Labels: dashboard, decision, size:S
Milestone: 1. Decide and audit
Number: #1

**Body**

**Why**
The same word counts different things on different pages. Connected is 117 on Members, 155 on Reports and 182 in Metabase. These definitions go into `docs/dashboard/glossary.md`, and everything else follows them.

**Decide** (recommendation in brackets)
- [ ] What counts as a member: whether leaders and admins are included, and how test accounts are excluded. (Per service for now, since only one service uses VineMe; DEV-9 covers church-wide views. Include leaders and admins, and flag test accounts on `users` rather than matching names.)
- [ ] What counts as connected. (An active member of at least one group right now. Attended but not added stays pending. Someone who left with no other group isn't connected.)
- [ ] Where people whose requests were all archived sit. (Under "Not in a group yet", with a filter for "requests closed".)
- [ ] What "new" means. ("New" means signed up in the last 30 days. "Newcomer" means new to church, from `users.newcomer`.)
- [ ] When a Needs help flag clears. (When clergy mark it handled, or the person becomes connected.)

**Done when**
- Each choice is written into `glossary.md` and its "Decision needed" marker removed.

**Blocks:** DATA-1, DATA-2, MEM-1, MEM-2

---

### DEC-2 · Agree the follow-up time rules and wording

Labels: dashboard, decision, size:S
Milestone: 1. Decide and audit
Number: #2

**Body**

**Why**
The Follow-ups page says 31 requests need attention, but its rules differ from the reference SQL, and the dashboard uses several words for the same idea.

**Decide** (recommendation in brackets)
- [ ] The time limits. (Keep 6 days to first contact, then 10 days after reaching out, 14 after speaking to them, and 30 from attending to being added.)
- [ ] What resets the clock. (Stage moves, status changes and notes from the group's leaders. Not admin notes, or a clergy note would make an untouched request look on track.)
- [ ] Attended but not added. (Keep its own count, but flag anyone past 30 days as needing attention. The dashboard never flags them today.)
- [ ] Stage 2's name. (Whatever leaders see in the app, "Spoken to" or "Invited", used everywhere.)
- [ ] The name for requests past their limit. ("Needs attention" everywhere. Drop "overdue", "to follow up" and "waiting" as labels.)
- [ ] Very old requests. (A nudge after 90 days with no action: "Add or archive?")

**Done when**
- Each choice is written into `glossary.md` and its marker removed.

**Blocks:** DATA-1, QW-9, FU-1, FU-2, FU-5

---

### DEC-3 · Agree how Insights measures things

Labels: dashboard, decision, size:S
Milestone: 1. Decide and audit
Number: #3

**Body**

**Why**
Some Metabase measures only count requests that reached a stage, so they look better than they are. Q3 2026 shows 100% attended within 30 days, but that's 4 people out of about 15 requests.

**Decide** (recommendation in brackets)
- [ ] The page's name. ("Insights" or "Stats". Not "Performance", which sounds like appraising volunteers.)
- [ ] The Results headline: people or requests. (People: 182 of 259 who asked have attended a group, about 70%. Counted by requests, it's about 50%.)
- [ ] The base for the Team measures. (Every request in the period old enough to judge, with misses counted, rather than only those that reached the stage.)
- [ ] Whether Metabase changes to match. (Yes, or the two will disagree again. Historical figures will drop.)

**Done when**
- Each choice is written into `glossary.md` and its marker removed.

**Blocks:** INS-1, INS-3, INS-4, INS-5, DATA-5

---

### DEC-4 · Agree the smaller product choices

Labels: dashboard, decision, size:S
Milestone: 1. Decide and audit
Number: #4

**Body**

**Decide** (recommendation in brackets)
- [ ] Invite user. (Hide it for now. Later it becomes "Invite a colleague", DEV-6.)
- [ ] What the group badge counts and sorts by. (Requests needing attention, not all pending. A group with 7 pending, none of them needing attention, isn't a problem.)
- [ ] How wide search goes. (Search on the Groups page first, and a global search later, POL-2.)
- [ ] The order of the Members cards. (All members, then Connected, Not yet connected, Archived and No requests, which add up to All members, then Needs help and New in 30 days.)
- [ ] How the Insights groups tab is framed. ("Where to offer support", not a league table. The leaders are volunteers.)

**Done when**
- Each choice is recorded here, and in `glossary.md` where it defines a term.

**Blocks:** QW-3, GRP-1, GRP-2, MEM-1, INS-5

---

### AUD-1 · Audit every number and data point (read-only)

Labels: dashboard, data, size:M
Milestone: 1. Decide and audit
Number: #5

**Body**

**Why**
Several numbers disagree between pages and with Metabase, and some data on screen doesn't exist (Outreach Connect shows "Pet friendly", but there's no such field). Fixing anything before knowing why would be guesswork.

**What to do** (no code changes)
1. For every page and drawer, list each number and data point shown: the file that produces it, the tables and columns it reads, and its logic in plain English.
2. Flag anything hard-coded, guessed or not backed by a real column.
3. Compare the follow-up logic with `docs/dashboard/reference/follow-ups.sql` and list every difference.
4. Explain each of the known gaps below.
5. Answer these data questions:
   - Does `church_admin` access show the whole church or just one service?
   - Where are "I can't find a group" (needs help) requests stored?
   - How is group status (pending approval, approved, closed) stored?
   - Does `group_membership_notes` record who made each change, and whether they acted as the leader or as an admin?
   - Where are archive reasons defined?
   - Can the confirmed email and `auth.users.email_change` be read on the server?
   - When clergy tick a stage in the dashboard, is a `group_membership_notes` row written the same way the app does it? The follow-up clock and the history both depend on it.
   - Does the drawer's "Add a note" save anything today, and with what `note_type`? If it saves as `manual`, clergy notes are already resetting the clock.
6. Check every table, column, status value and time limit named in `docs/dashboard/glossary.md` against the code and database, and list any that are wrong.

**Reference figures** (29 October 2026, 6:30pm Evening Service, from `reference/people.sql` and the glossary's request scope)
- 560 members: 184 connected, 23 not yet connected, 59 archived, 294 no requests
- 266 people have made a request (Metabase's Total Users donut also shows 266, of 558 people; its User-Requests bar shows 264)
- 333 requests: 48% added, 16% pending, 29% archived, 7% left
- Archived requests by reason: No longer interested 54, Not contactable 26, Not suitable for group 10, Group at capacity 5, none recorded 2

**Known gaps to explain**
- Total people: Overview 558, Metabase 550, Members 500
- Connected or attended: Members 117, Reports 155, Metabase 182
- Requested: Reports 24 (people still waiting) against Metabase 77 (which includes people whose requests were all archived)
- Pending: Members 30 (people) against Overview 46 (requests)
- Need attention 31 plus on track 8 is 39, exactly everyone before Attended, so the 30-day Attended rule isn't applied
- Follow-up cards count days past the limit, not days waiting (one card says "Overdue 157 days" where its drawer says "requested 163 days ago")
- May sign-ups: 13 on the dashboard, 10 in Metabase; the other months match
- The follow-up drawer says "Invited" where everything else says "Spoken to"
- The Follow-ups intro mentions a "Review" button that doesn't exist and says changes aren't saved, while the drawer says ticking a box saves straight away

**Done when**
- `docs/dashboard/audit.md` is committed, covering all six steps.

**Plan mode:** yes

---

### QW-1 · Members list stops at 500 and search misses people

Labels: dashboard, bug, members, size:M
Milestone: 2. Quick wins and bugs
Number: #6

**Body**

**Why**
Members shows "500 of 500 people", but there are about 550, and searching for someone known to be there finds nothing. It looks like a row limit, with search only filtering the rows already loaded.

**What to do**
- Find where the list is limited.
- Paginate and search on the server, so every member can be reached and the count is the true total.

**Done when**
- The count shows the true total. Until DEC-1 settles the definition, that's the database count of members.
- Searching finds people beyond the first 500.

**Plan mode:** yes

---

### QW-2 · Settings: "Coming soon" over the ChurchSuite section

Labels: dashboard, settings, size:S
Milestone: 2. Quick wins and bugs
Number: #7

**Body**

**Why**
The ChurchSuite connection isn't finished (DEV-14).

**What to do**
- Cover the ChurchSuite section with a grey panel saying "Coming soon". Nothing underneath can be clicked.

**Done when**
- The section is clearly unavailable and can't be used.

---

### QW-3 · Overview: slimmer header, hide "Invite user"

Labels: dashboard, overview, size:S
Milestone: 2. Quick wins and bugs
Number: #8

**Body**

**Why**
The dark banner takes a lot of space, and "Invite user" doesn't work.

**What to do**
- Reduce the banner to the church and service name, with one short line at most.
- Remove "Connect ChurchSuite from Settings", since Settings now says Coming soon.
- Hide "Invite user". DEV-6 brings it back properly.

**Done when**
- The stat cards sit near the top of a laptop screen.

**Depends on:** DEC-4

---

### QW-4 · Groups: tidy the cards and drawer

Labels: dashboard, groups, size:S
Milestone: 2. Quick wins and bugs
Number: #9

**Body**

**What to do**
- List every leader on each card, not just the first: "Led by [leader] and [leader]", with "+1" beyond two.
- Remove the pet tags. There's no pet field in the database. Note in the commit where "Pet friendly" on Outreach Connect was coming from (AUD-1 should already say).
- Show a short area on cards (like "Chelsea") rather than a full address. Beta Connect Group shows a full street and postcode. If there's no area field, say so rather than inventing one.
- In the group drawer, remove the location and time from the header, since "When and where" repeats them just below.

**Done when**
- No card shows invented data, every leader is named, and nothing repeats in the drawer.

**Depends on:** AUD-1

---

### QW-5 · Drawers: tidy copy and remove dead buttons

Labels: dashboard, shared, size:S
Milestone: 2. Quick wins and bugs
Number: #10

**Body**

**What to do**
- Follow-up drawer: change the note placeholder from "Seen by leaders of this group" to "Send a note to this group's leaders".
- Member drawer: remove "Review their follow-up" (it goes nowhere) and "Browse groups".

**Done when**
- No button in a drawer leads nowhere.

---

### QW-6 · Shared contact block with formatted phone numbers

Labels: dashboard, shared, size:S
Milestone: 2. Quick wins and bugs
Number: #11

**Body**

**Why**
The follow-up and member drawers each show a raw number like 447700900123. They should share one component.

**What to do**
- Make one contact block, used by both drawers.
- Format UK numbers as +44 7700 900123. Keep the Call and WhatsApp buttons.
- Leave room for an email (DATA-4) and for a second row for the group's leader (FU-3).

**Done when**
- Both drawers use the same component and show formatted numbers.

---

### QW-7 · Follow-ups: collapse group leader view by default

Labels: dashboard, follow-ups, size:S
Milestone: 2. Quick wins and bugs
Number: #12

**Body**

**What to do**
- In the "Group leader" view, start with every group collapsed.
- The "Status" view stays expanded, as now.

**Done when**
- Switching to Group leader shows a compact list of groups.

---

### QW-8 · Overview chart: readable stage colours

Labels: dashboard, overview, size:S
Milestone: 2. Quick wins and bugs
Number: #13

**Body**

**Why**
The four stages in "Pending requests by group" are close shades of pink and hard to tell apart.

**What to do**
- Use the stage colours from the chart palette (DEV-10): clearly distinct, none of them red or green (those are reserved for needs attention and on track).
- Use the same stage colours anywhere stages appear, taken from the palette tokens rather than hard-coded.

**Done when**
- The stages can be told apart at a glance, in light and dark mode.

**Depends on:** DEV-10

---

### QW-9 · Terms dictionary: one place in the code for every label

Labels: dashboard, shared, size:S
Milestone: 2. Quick wins and bugs
Number: #14

**Body**

**Why**
`glossary.md` defines every term, but labels are typed into each component, so the same idea gets different names ("Invited" and "Spoken to"; "Connected" meaning two things). One terms file means a term is renamed in one place.

**What to do**
- Create one terms file (for example `lib/dashboard/terms.ts`) that maps each status, stage and measure to its label and a one-line description, matching `glossary.md` exactly.
- Replace hard-coded labels on every page, drawer, chart, legend and filter with imports from it.
- Use the stage names agreed in DEC-2.

**Done when**
- No component hard-codes a status label, and the terms file matches `glossary.md`.

**Depends on:** DEC-1, DEC-2

---

### DATA-1 · Request view: one row per request, with stage and time limits

Labels: dashboard, data, size:L
Milestone: 3. Data foundations
Number: #15

**Body**

**Why**
Each page calculates its own numbers, so they disagree. One view, read by every page, fixes that at the source.

**What to do**
- Create a Postgres view with one row per request (every `group_memberships` row, as DEC-1 agreed): person, group, the group's leaders, status, stage, request date, stage dates, added date, archive reason, last action date, days since the last action, current limit, follow-up state (needs first contact, on track or needs attention) and days until due.
- Base it on `docs/dashboard/reference/follow-ups.sql`, which holds the agreed follow-up rules, with these fixes:
  - a left join to leaders (the inner join drops requests to groups with no active leader)
  - exclude test accounts as the glossary says
- Respect row-level security (`security_invoker = true`), so one church can never see another's data.

**Done when**
- Its counts reconcile with the reference figures in AUD-1, or each difference is explained in `audit.md`.

**Depends on:** DEC-1, DEC-2, AUD-1

**Plan mode:** yes

---

### DATA-2 · Person view: one row per member

Labels: dashboard, data, size:M
Milestone: 3. Data foundations
Number: #16

**Body**

**What to do**
- Build on DATA-1. One row per member: signed-up date, newcomer, role, connected, plugged in, in a group now, furthest stage, number of pending requests, whether any request needs attention, needs help (open), and whether all their requests were archived.
- Use the same row-level security approach as DATA-1.

**Done when**
- Connected + Not yet connected + Archived + No requests = All members, and the counts match `reference/people.sql`.
- The totals match the definitions in `glossary.md`.

**Depends on:** DATA-1, DEC-1

**Plan mode:** yes

---

### DATA-3 · Point the existing numbers at the views

Labels: dashboard, data, size:M
Milestone: 3. Data foundations
Number: #17

**Body**

**What to do**
- Overview cards, Follow-ups counts and cards, Members cards and list, and Groups badges all read from the views.
- No redesign yet. Only the source of each number changes.

**Done when**
- The same number shows the same value on every page.

**Depends on:** DATA-1, DATA-2

**Plan mode:** yes

---

### DATA-4 · Email in the contact block, read on the server

Labels: dashboard, data, shared, size:M
Milestone: 3. Data foundations
Number: #18

**Body**

**What to do**
- Show the confirmed email, falling back to `auth.users.email_change` when there isn't one.
- Read it on the server only. The browser must never query the auth schema.
- Add an Email button (mailto) to the contact block.

**Done when**
- Drawers show an email where one exists, and the auth schema isn't exposed to the browser.

**Depends on:** AUD-1, QW-6

**Plan mode:** yes

---

### DATA-5 · Keep Metabase usable until it's retired (Olly, in Metabase)

Labels: dashboard, data, size:S
Milestone: 3. Data foundations
Number: #19

**Body**

**Why**
Metabase is being retired once the dashboard replaces it. Until then it's a useful cross-check, but it doesn't have to match where the dashboard's definitions are better (DEC-3).

**What to do** (in Metabase, only what's worth doing before it's retired)
- Change the inner join on leaders to a left join, so the User-Requests bar shows 182 connected rather than 181.
- Fix `spoken_within_sla` in the per-person query: it counts a miss once a request is 14 days old, but the limit is 16.
- Fix the "Total Requests by Group" legend: its light grey is labelled "joined", but the same grey means "left" in the Total Requests donut.

**Done when**
- Metabase is good enough to cross-check against until it's switched off. Close this issue when it is.

**Note:** Metabase's Total Users donut shows 558 members, not 560: its test-account filter (`last_name not like '%Test%'`) drops the 2 members with no last name, who are members under DEC-1. A known difference, explained in `audit.md`; fix it only if Metabase is staying.

---

### FU-1 · Follow-ups: explanation, time limits and totals at the top

Labels: dashboard, follow-ups, size:S
Milestone: 4. Pages
Number: #20

**Body**

**What to do**
- Replace the intro text. It mentions a "Review" button that doesn't exist and says changes aren't saved.
- Add a short explanation of the three follow-up states: needs first contact, on track and needs attention. Say what a pending request is (asked to join, not yet added or archived, so Attended still counts) and what resets the clock. One line, plus a "How this works" expander.
- Show each stage's time limit on the page, for example as a one-line key: Not contacted 6 days, Reached out 10, Spoken to 14, Attended 30. The cards don't show due dates, so this is where clergy see them.
- Show the total and how it splits into the three states, so it ties back to Overview. Show attended but not yet added as its own count beside it.

**Done when**
- A new clergy member can understand the page without asking, and the total matches Overview.

**Depends on:** DATA-3

---

### FU-2 · Follow-ups: plain-language cards and colours

Labels: dashboard, follow-ups, size:M
Milestone: 4. Pages
Number: #21

**Body**

**What to do**
- Replace "Overdue X days" and "Due in X days" with wording for each stage, as in the glossary:
  - Not contacted: "No contact in 5 days", counted from the request, and "Requested today" on the first day
  - Reached out: "Reached out today", "Reached out yesterday", "Reached out 3 days ago"
  - Spoken to and Attended: the same pattern
- The time comes from the stage date. If a later note or contact reset the clock, add it: "Reached out 12 days ago, updated 3 days ago".
- Colour the pill by follow-up state: green for on track, red for needs attention, neutral for needs first contact. The wording must still make sense without the colour.
- Don't show when the next contact is due. FU-1 shows the limits at the top of the page.
- Work out "today" and "yesterday" in UK time.
- Make the stage headings inside each group stand out more.

**Done when**
- Every card reads as a plain phrase, and its colour matches its follow-up state.

**Depends on:** DATA-3

---

### FU-3 · Follow-ups drawer: full history, leader contact, real archive reasons

Labels: dashboard, follow-ups, size:M
Milestone: 4. Pages
Number: #22

**Body**

**What to do**
- History: show every note and every stage change, with dates, visually distinct from each other, and who made each one where that's recorded.
- Add a second row to the contact block: "Leader: [name]", with call, WhatsApp and email.
- Archive reasons: read them from where the app defines them (AUD-1 says where), replacing the current list.

**Done when**
- The drawer shows the whole story of a request, and both people's contact details.

**Depends on:** QW-6, AUD-1

---

### FU-4 · Follow-ups: confirm before acting on a leader's behalf

Labels: dashboard, follow-ups, size:M
Milestone: 4. Pages
Number: #23

**Body**

**What to do**
- Today the dashboard writes nothing. Saving stage changes, Archive and Add to group all have to be built, writing to `group_membership_notes` the same way the app does.
- When an admin ticks a stage or archives a request, show a confirmation: "You're updating this on behalf of [leader name]", with an optional note.
- Save the change to `group_membership_notes` the same way the app does, so it resets the follow-up clock and shows in the history. AUD-1 says whether the dashboard does this today.
- Record in the history that an admin made the change.
- Save the optional note as a clergy note (FU-6).
- Notifying the leader is DEV-2, not this issue.

**Done when**
- No admin change happens without the confirmation, every stage change resets the clock, and the history shows who made it.

**Depends on:** DEV-13, AUD-1, FU-6 (for the note), and DEV-7 if AUD-1 finds changes don't record who made them

**Plan mode:** yes

---

### FU-5 · Follow-ups: nudge on very old requests

Labels: dashboard, follow-ups, size:S
Milestone: 4. Pages
Number: #24
Parked: closed as not planned by DEC-2. Reopen if very old requests become a problem.

**Body**

**Why**
Many requests from 2025 are probably resolved but never updated, such as King's Road's batch from last autumn. They crowd out the requests that are really slipping.

**What to do**
- Requests with no action for the threshold agreed in DEC-2 (recommended: 90 days) show "Add or archive?", with both actions to hand.

**Done when**
- Very old requests are clearly marked and can be resolved in one or two clicks.

**Depends on:** DEC-2

---

### MEM-1 · Members: top cards

Labels: dashboard, members, size:M
Milestone: 4. Pages
Number: #25

**Body**

**What to do**
- Cards, in this order: All members; then Connected, Not yet connected, Archived and No requests, which add up to All members; then, set apart because they overlap the others, Needs help and New in 30 days.
- These replace the current cards (Connected, Pending follow-up, Looking for a group, New in 30 days). "Pending" describes requests, not people, so it isn't a card here.
- Each card filters the list, and the filter goes in the URL (for example `?filter=needs-help`) so Overview can link to it.

**Done when**
- The four middle cards add up to All members, and every card can be linked to.

**Depends on:** DATA-2

---

### MEM-2 · Members: table columns and status

Labels: dashboard, members, size:M
Milestone: 4. Pages
Number: #26

**Body**

**What to do**
- Put "Signed up" first, with the full date.
- Role: Admin, Leader, Newcomer or Existing member, with role filters to match.
- Groups: the count, then the names, cut off if long: "2 · Outreach Connect, Central…"
- Status, in small pieces with one job each: the furthest stage; "+3 more requests pending" if they have more open requests; a Needs help tag; a red marker if any request needs attention.
- Add a sort: "Most open requests".
- Use one meaning of "New" (DEC-1).

**Done when**
- At a glance, you can tell where someone has got to, what's still open and whether anything is slipping.

**Depends on:** DEC-1, DATA-2

---

### MEM-3 · Members: person drawer, with every request and a notes history

Labels: dashboard, members, size:M
Milestone: 4. Pages
Number: #27

**Body**

**Why**
The drawer should be the one place to see everything about a person. Today it leaves out requests that were archived, or whose group has since closed, and it shows no notes. For example, one member asked to join a group, the request was archived, and the drawer doesn't show it.

**What to do**
- QW-5 already lists every request, including archived ones and requests to closed groups, with a Review button on pending requests that opens the follow-up drawer. This issue still adds the stage and timing wording, the collapsed "Past requests" section, the counts in the heading and the notes history.
- List every request the person has made, including archived requests and requests to groups that have since closed. Each row shows the stage and timing in the same wording and colours as the follow-up cards (FU-2). Clicking a row opens that request's follow-up drawer, reusing the component.
- Put archived requests in a collapsed "Past requests" section, with their archive reasons and dates.
- Show the counts in the heading, for example "Groups · 4 requests, 1 archived".
- Add a notes history: every note from all of their requests in one list, newest first, each labelled with its group, with stage changes shown distinctly from notes. Once DEV-12 exists, notes about the person join the same list.
- Once DEV-12 exists, add a note box for notes about the person that aren't tied to a group.
- Use the shared contact block.

**Done when**
- From the drawer, you can see every request a person has made, including archived ones, and everything noted about them, in one place.

**Depends on:** FU-2, QW-5, QW-6, and DEV-12 for notes about the person

---

### GRP-1 · Groups: count, filters and search

Labels: dashboard, groups, size:M
Milestone: 4. Pages
Number: #28

**Body**

**What to do**
- Show a count at the top ("18 groups") that updates with filters and search.
- Add filters: Taking new members and At capacity. They apply to the map as well as the cards, and go in the URL so Overview's card can link to `?filter=at-capacity`.
- Add a search box for this page: group name, leader, member, or anyone with a pending request. Searching for a person narrows the cards and the map to the groups they're in or have asked to join. The search covers this page only.

**Done when**
- Filtering to At capacity shows the right count on both the cards and the map, and searching for a person shows only their groups, including ones they've asked to join.

---

### GRP-2 · Groups: badge and sort

Labels: dashboard, groups, size:S
Milestone: 4. Pages
Number: #29

**Body**

**What to do**
- The badge on each group card shows how many of its requests need attention, in red, replacing "X to follow up". If none need attention but some are pending, show the pending count in a neutral colour. No pending requests, no badge.
- Sort groups by requests needing attention, most first, then by pending requests. Change "busiest first" to match, for example "Groups needing the most attention first".
- Use the same order for the group leader view on Follow-ups.

**Done when**
- The badge and sort use the same numbers as Follow-ups, and both pages list groups in the same order.

**Depends on:** DATA-3

---

### GRP-3 · Groups: Active / Closed switch

Labels: dashboard, groups, size:S
Milestone: 4. Pages
Number: #30

**Body**

**What to do**
- Add a switch between active and closed groups. Pending approval joins it later (DEV-3).

**Done when**
- Closed groups can be found without cluttering the main view.

**Depends on:** AUD-1 (how group status is stored)

---

### GRP-4 · Groups drawer: open a member's drawer

Labels: dashboard, groups, size:S
Milestone: 4. Pages
Number: #31

**Body**

**What to do**
- Clicking a member in the group drawer opens their member drawer (MEM-3). Reuse it rather than building a second one.

**Done when**
- A group member's details are one click away.

**Depends on:** MEM-3

---

### OV-1 · Overview: four clickable cards

Labels: dashboard, overview, size:S
Milestone: 4. Pages
Number: #32

**Body**

**What to do**
- Four cards, by urgency: Needs help; Pending requests (with "31 need attention" beneath); Groups at capacity ("5 of 18"); Total members.
- Each card is clearly clickable (hover state, pointer) and opens the filtered page: Members filtered to needs help, Follow-ups, Groups filtered to at capacity, and Members.

**Done when**
- Every card opens the page that explains its number.

**Depends on:** MEM-1, GRP-1, DATA-3

---

### OV-2 · Overview: pending chart toggle

Labels: dashboard, overview, size:M
Milestone: 4. Pages
Number: #33

**Body**

**What to do**
- Add a toggle to "Pending requests by group": By stage, or By follow-up state (needs attention, on track, needs first contact).
- In the follow-up view, sort groups by how many requests need attention, so the groups needing the most rise to the top. Animate the bars to their new places when the toggle changes, so the reshuffle is easy to follow.
- Hovering a bar segment shows its count. Keep "View as table".

**Done when**
- One click shows which groups have requests slipping, with those groups at the top.

**Depends on:** QW-8, DATA-3

---

### OV-3 · Overview: "This week" strip

Labels: dashboard, overview, size:S
Milestone: 4. Pages
Number: #34

**Body**

**What to do**
- A slim strip showing new requests this week, requests resolved this week (added or archived), and new sign-ups this week.

**Done when**
- It's clear at a glance whether the backlog is growing or shrinking.

**Depends on:** DATA-1, DATA-2

---

### OV-4 · Overview: who's waiting longest

Labels: dashboard, overview, size:M
Milestone: 4. Pages
Number: #35

**Body**

**What to do**
- Replace the newest-people list with the people who have the most open requests, showing how many are open and how many have been actioned. One person currently has 6 requests, 5 of them still pending.
- Each opens their member drawer.
- Keep a line with "X new this week", linking to Members sorted newest first.

**Done when**
- The people most at risk of falling through are on the front page.

**Depends on:** DATA-2, MEM-3

---

### INS-1 · Insights: rename, four tabs and page-wide filters

Labels: dashboard, insights, size:M
Milestone: 4. Pages
Number: #36

**Body**

**What to do**
- Rename the page from Reports to **Insights**, in the navigation and anywhere it's mentioned.
- Reduce six tabs to four: Activity (was Downloads), Results (was Pipeline and Connection), Groups and Team. Newcomers becomes a filter.
- Page-wide filters: Everyone or Newcomers (check it actually filters), a date range, and week, month or quarter. Put them in the URL.
- Headings as plain questions. No "pipeline", "effectiveness" or "performance".
- Give the page a heading question: "How are people getting connected at [church name]?"

**Done when**
- The page is called Insights, with four tabs, filters that apply everywhere, and no corporate words.

---

### INS-2 · Insights: Activity tab

Labels: dashboard, insights, size:M
Milestone: 4. Pages
Number: #37

**Body**

**What to do**
- Two charts: people by the date they signed up, and requests by the date they were made. They answer different questions, so keep them apart.
- Both follow the week, month or quarter toggle, with the current period marked in progress.
- Check May: 13 sign-ups here against 10 in Metabase.

**Done when**
- Both charts match Metabase for the same period, or each difference is explained. Where the dashboard's definitions are better, the dashboard wins.

**Depends on:** INS-1, DATA-2

---

### INS-3 · Insights: Results tab

Labels: dashboard, insights, size:L
Milestone: 4. Pages
Number: #38

**Body**

**What to do**
- Headline: the connected rate, counted in people. Of everyone who has requested, the share who are connected (182 of 259, 70%, on 22 October 2026), with a one-line explanation.
- The connection bar for everyone who has requested: Connected, then Not yet connected split into Spoken to, Reached out and Not contacted, then Archived.
- A second measure, the plugged-in rate: of the people who are connected, the share who were added to a group, including those who've since left (status active or inactive). Label it so it doesn't read as "still in a group".
- Why requests were closed: the archive reasons, plus how long people had waited before "No longer interested".
- Note beside the reasons that "Not suitable for group" and "Group at capacity" are re-referral cases (DEV-4).
- Optional, to try if there's time: the connected rate by the month people first requested, with recent months marked in progress.

**Done when**
- A clergy member can say how well VineMe is working in one sentence, with the number.

**Depends on:** INS-1, DATA-1, DATA-2

---

### INS-4 · Insights: Team tab

Labels: dashboard, insights, size:M
Milestone: 4. Pages
Number: #39

**Body**

**What to do**
- Three measures over time, counted from the request date: reached out within 6 days, spoken to within 16, attended within 30.
- Count requests as the glossary says: only once the result is known. The logic is in `docs/dashboard/reference/followed-up-in-time.sql`.
- Show how many requests each percentage is based on, and mark the current period as in progress.
- Show year-on-year in points: "58% (73% last year)".
- Add an info button ("How are these counted?") that opens the counting table from the glossary: reached in time is a hit; reached late, archived first or past the limit is a miss; still open within the limit isn't counted yet. Keep it short and in plain words.
- Beside each percentage, show the average days to reach that stage, among requests that reached it, as the Metabase Team tab does.
- Stage dates only exist from 7 January 2026, so the Team tab starts from Q1 2026.

**Done when**
- The numbers can't flatter themselves (a quarter with 4 attended out of 15 requests can't show 100%), and a clergy member can find out how they're counted without asking.

**Depends on:** INS-1, DATA-1

---

### INS-5 · Insights: Groups scorecard

Labels: dashboard, insights, size:L
Milestone: 4. Pages
Number: #40

**Body**

**What to do**
- One table, one row per group: requests, members, needs attention now, and the three Team measures.
- Sortable by any column, with a small rank number in each cell and shading like the Metabase tables.
- Show the count next to every percentage, and grey out groups with fewer than 5 requests in the period.
- Add a "See stats" button to the group drawer that opens this tab, filtered to that group.
- The three measures use the same counting rule as the Team tab (INS-4), and show how many requests each one is based on.
- Head the tab "How are our groups doing?", framed as where to offer support. It isn't a league table: the leaders are volunteers.
- Clicking a measure's column heading opens a bar chart of that measure across groups, sorted, with each bar showing its count. Clicking again closes it.

**Done when**
- Clergy can spot which groups need support, without small numbers misleading them.

**Depends on:** INS-1, INS-4, DEC-4

---

### POL-1 · Tap a profile picture to enlarge it

Labels: dashboard, shared, size:M
Milestone: 5. Polish
Number: #41

**Body**

**What to do**
- One shared avatar component. Tapping the photo zooms it out from where it sits (a shared element transition) into a larger, centred view (a lightbox).
- Use it in every drawer. Escape or a click outside closes it.

**Done when**
- It works in the follow-up, member and group drawers, from the same component.

---

### POL-2 · Search across the dashboard

Labels: dashboard, shared, size:M
Milestone: 5. Polish
Number: #42
Parked: closed as not planned by DEC-4. Each page's search covers that page only. The Groups search (GRP-1) can find people.

**Body**

**What to do**
- A search bar in the top navigation that finds people and groups from any page, reusing the server-side search from QW-1 and GRP-1.

**Done when**
- Typing a name finds the person and their groups from anywhere.

**Depends on:** QW-1, GRP-1

---

### DEV-1 · Notify the leader when an admin adds a note

Labels: dashboard, needs-dev, follow-ups
Milestone: 6. Dev backlog
Number: #43

**Body**

**Why**
Clergy can add notes in the dashboard, but leaders won't see them unless they're told.

**What to do**
- When an admin adds a note to a request, notify the group's leaders in the app: "[Name] added a note about [person]".

**Done when**
- Leaders get a notification that opens the request.

---

### DEV-2 · Notify the leader when an admin acts on their behalf

Labels: dashboard, needs-dev, follow-ups
Milestone: 6. Dev backlog
Number: #44

**Body**

**Why**
FU-4 lets clergy update a stage or archive a request for a leader. The leader needs to know their list changed.

**What to do**
- Notify the group's leaders: "[Name] updated [person] to Spoken to on your behalf", including any note.

**Done when**
- Every admin change to a leader's request produces a notification.

**Depends on:** FU-4

---

### DEV-3 · Group approval flow

Labels: dashboard, needs-dev, groups
Milestone: 6. Dev backlog
Number: #45

**Body**

**What to do**
- When someone asks to create a group, notify clergy.
- Let clergy approve or decline it from the dashboard.
- Flag new group requests on Overview.
- Show pending groups in the Groups page switch (GRP-3).

**Done when**
- A new group can go from request to approved without leaving the dashboard.

---

### DEV-4 · Refer someone to a group

Labels: dashboard, needs-dev, members
Milestone: 6. Dev backlog
Number: #46

**Body**

**Why**
When a group isn't the right fit, the person should be pointed to another one, not dropped. So far 12 requests have been closed as "Not suitable for group" (7) or "Group at capacity" (5). The same action lets clergy place someone who asked for help.

**What to do**
- In the app and the dashboard, refer a person to a different group. This creates a new request to that group's leaders, notifies the person, and the cycle starts again.
- Offer it straight after archiving with "Not suitable for group" or "Group at capacity".
- In the dashboard: a "Refer to a group" button in the member drawer footer, and in the needs help flow.

**Done when**
- A person can be re-referred in a few clicks, and the new request shows up like any other.

---

### DEV-5 · ChurchSuite sync in Settings

Labels: dashboard, needs-dev, settings
Milestone: 6. Dev backlog
Number: #47
Parked: closed as not planned. The plan changed: showing groups on church websites is being rethought, probably not through ChurchSuite. Syncing users into ChurchSuite is now DEV-14.

**Body**

**Why**
Churches want VineMe groups on their own websites. The plan is to sync VineMe and ChurchSuite groups rather than rebuild VineMe as a website.

**What to do**
- Sync groups between VineMe and ChurchSuite, including capacity and memberships, with join requests made on the church website flowing back into VineMe.
- Replace the "Coming soon" panel (QW-2) with the real connection settings.

**Done when**
- A church can connect ChurchSuite from Settings and see its groups on its website.

---

### DEV-6 · Invite someone to the dashboard

Labels: dashboard, needs-dev, shared
Milestone: 6. Dev backlog
Number: #48

**Body**

**What to do**
- Let an admin invite another person to the dashboard, with one of the roles from DEV-9, so they only see what their role allows.
- Name the button after the roles, for example "Invite an admin". Avoid "colleague".
- Bring back the button hidden in QW-3 once it works.

**Done when**
- An invited person can sign in and sees only what their role allows.

**Depends on:** DEV-9

---

### DEV-7 · Record who made each change

Labels: dashboard, needs-dev, data
Milestone: 6. Dev backlog
Number: #49

**Body**

**Why**
Only needed if AUD-1 finds that `group_membership_notes` doesn't record who made a change. Without it, the history can't tell a leader's action from an admin's, and the clock rule in DEC-2 can't separate leader notes from admin notes.

**What to do**
- Record the author of every note and every stage or status change, and whether they acted as the group's leader or as an admin.

**Done when**
- Every row in `group_membership_notes` has an author and their role.

**Depends on:** AUD-1

---

### DEV-8 · Group details as real fields, like pet friendly

Labels: dashboard, needs-dev, groups
Milestone: 6. Dev backlog
Number: #50

**Body**

**Why**
The dashboard showed pet tags with no data behind them. They're a nice idea, but they need to be real. Low priority.

**What to do**
- Let leaders set group details in the app, such as pet friendly.
- Then show them on the Groups page.
- Add an area field to group creation in the app (for example 'Chelsea'), separate from the map pin, and show it on group cards.

**Done when**
- Every tag on a group card comes from a field a leader set.

---

### DEV-9 · Rethink role-level access: service and church views

Labels: dashboard, needs-dev, shared
Milestone: 6. Dev backlog
Number: #51

**Body**

**Why**
Today the `church_admin` role opens the dashboard, and it isn't clear whether it shows the whole church or one service (AUD-1 finds out). Only one service uses VineMe now, but that will change. Aonghas is keen to help think this through and should be involved.

**What to do**
- Design the roles with Aonghas: a service pastor sees their own service; a church pastor sees the whole church and can drill down into each service.
- Make the request and person views (DATA-1, DATA-2) respect those roles through row-level security.
- Add a service picker for anyone who can see more than one service.
- Show the current church and service in the top bar, and let anyone who can see more than one switch between them there, using the church icon in the top right rather than adding a second control.

**Done when**
- Each role sees exactly its own scope, and church-wide request counts add up to the sum of each service's.

**Depends on:** AUD-1, DATA-1, DATA-2

---

### DEV-10 · Chart colour palette, built from the brand colours

Labels: dashboard, needs-dev, design, shared
Milestone: 6. Dev backlog
Number: #52

**Body**

**Why**
The charts use four close shades of pink, so the stages can't be told apart at a glance. The brand colour scheme already set up in the repo is a good base, but charts need more than shades of one colour. QW-8 and the Insights charts wait on this, so it's worth doing early.

**What to do**
- Start from the colour scheme already in the repo, and extend it rather than adding a second set.
- Define:
  - four stage colours (Not contacted, Reached out, Spoken to, Attended) that read as an order and are clearly distinct, none of them red or green
  - status colours for needs attention (red) and on track (green), used for nothing else, and a neutral colour for needs first contact
  - a small set of colours for other charts, such as sign-ups against requests
- Check contrast and colour blindness, in light and dark mode.
- Store them as tokens in the codebase, and note them in the Colours section of `docs/dashboard/glossary.md`.

**Done when**
- The palette exists as tokens, is documented in the glossary, and passes the contrast and colour-blindness checks.

---

### MEM-4 · Needs help: contact and resolve people who can't find a group

Labels: dashboard, members, size:M
Milestone: 4. Pages
Number: #53

**Body**

**Why**
People who press "I can't find a group" in the app have asked for help outright, and only clergy see them. The app lets you mark them contacted and resolved, but the dashboard has nothing yet.

**What to do**
- First, check in the app code how the flag works: when `cannot_find_group` is set, whether resolving sets it back to false, and what happens if someone asks again. To let Claude Code read the app, clone its repo next to this one and run `/add-dir` with its path. Record the answer in `glossary.md`.
- Agree with the devs where it lives: a filter on Members with actions, or its own list. The Overview "Needs help" card links to it.
- Show who needs help, when they asked and whether they've been contacted, oldest first.
- Let clergy mark someone contacted or resolved, writing the same `cannot_find_group_contacted_at` and `cannot_find_group_resolved_at` fields the app uses, so the app and dashboard stay in step.
- Decide whether needs help gets its own time limit, like the follow-up limits.
- Later, resolving can mean referring them to a group (DEV-4).
- Once DEV-12 exists, marking someone contacted can include a note about them.

**Done when**
- A clergy member can see everyone who needs help and mark them contacted or resolved, and the app shows the same state.

**Depends on:** DEC-1, DATA-2, DEV-13

**Plan mode:** yes

---

### DEV-11 · A proper test-account flag

Labels: dashboard, needs-dev, data
Milestone: 6. Dev backlog
Number: #54

**Body**

**Why**
Test accounts are excluded by matching "test" in the first name, last name or email. That can catch a real person (a surname like Testa) and miss test accounts with other names.

**What to do**
- Add an `is_test` flag to users, and set it for existing test accounts.
- Switch the views and the dashboard to the flag, and Metabase if it's still in use, and update `glossary.md`.

**Done when**
- Test accounts are excluded by the flag everywhere.

---

### FU-6 · Follow-ups drawer: clergy notes, with an "I've spoken to them" tick

Labels: dashboard, follow-ups, size:M
Milestone: 4. Pages
Number: #55

**Body**

**Why**
Clergy can add notes from the follow-up drawer. A note on its own shouldn't reset the follow-up clock, or a request nobody has acted on could look on track. But when clergy have actually spoken to the person, it should, because they've had contact (DEC-2).

**What to do**
- Save clergy notes with their own note type, never `manual` (the leaders' type), so they can't reset the clock by accident.
- Add a tick box to the note form: "I've spoken to [name]". A ticked note resets the clock for requests at Reached out, Spoken to or Attended. It never changes the stage; clergy change the stage separately if they want to. A request that's still Not contacted stays on its first-contact clock until the leader makes contact.
- Store the tick so the clock rule can read it, for example as a second note type or a flag on the note. Agree which with the devs, since the app reads the same table, and check the app shows the new note type(s) in its history without breaking.
- Count ticked clergy notes as a last action in `docs/dashboard/reference/follow-ups.sql` and in the request view (DATA-1).
- Show clergy notes in the history, marked as from clergy, with a ticked note shown as "Spoke to [name]".
- Notifying the leader is DEV-1, not this issue.

**Done when**
- Clergy can add a note with or without the tick, only ticked notes reset the clock, and both show in the dashboard and the app.

**Depends on:** AUD-1, DATA-1, DEV-13

**Plan mode:** yes

---

### DEV-12 · Notes about a person, not tied to a group

Labels: dashboard, needs-dev, data, members
Milestone: 6. Dev backlog
Number: #56

**Body**

**Why**
Clergy sometimes contact someone about finding a group in general, not about one request: someone who asked for help, or someone with several requests. Notes only exist on a group membership today (`group_membership_notes`), so there's nowhere to put them.

**What to do**
- Agree where person notes live. Recommended: a new table, for example `user_notes` with the person, the author, the text, the date and an "I've spoken to them" flag, rather than loosening `group_membership_notes`, which drives the follow-up clock.
- Decide who can see them. Recommended: clergy and admins only, protected by row-level security so only that church's admins can read them.
- Decide whether a person note marked "I've spoken to them" resets the clock on their pending requests. Recommended: no. Each request's clock stays with that group's follow-up, so one conversation doesn't mark several groups as on track.
- Use them for needs-help contacts too (MEM-4), since those people have no group yet.

**Done when**
- Clergy can add and read notes about a person from the dashboard, and only the right people can see them.

---

### QW-10 · Follow-ups drawer: switch off actions that don't save yet

Labels: dashboard, bug, follow-ups, size:S
Milestone: 2. Quick wins and bugs
Number: #58
Parked: closed as not planned. Not needed: the site won't be published until the dashboard can save changes (DEV-13).

**Body**

**Why**
The follow-up drawer's stage ticks, note box, "Add to group" and "Archive" look like they work but save nothing, and the drawer says "Ticking a box saves straight away". AUD-1 found the dashboard writes nothing at all.

**What to do**
- Until FU-4 and FU-6 make them save, disable the stage ticks, the note box, "Add to group" and "Archive", with a short line such as "Coming soon. For now, update this in the app".
- Do the same for the "Add to group" button on Attended cards, which doesn't save either.
- Remove the "Ticking a box saves straight away" line.

**Done when**
- Nothing in the drawer looks like it saves when it doesn't.

---

### DEV-13 · Let the dashboard save changes

Labels: dashboard, needs-dev, data
Milestone: 6. Dev backlog
Number: #59

**Body**

**Why**
The dashboard can't write to Supabase, so ticking a stage, adding a note, Add to group and Archive are all lost on refresh (AUD-1). FU-4, FU-6 and MEM-4 all need saving to work.

**What to do**
- Save changes on the server, as the signed-in admin. Never expose the Supabase service-role key in the browser.
- Add row-level security policies so church admins can only change their own church's requests, notes and needs-help records.
- Write the same rows the app writes (for example `group_membership_notes` for stage changes), so the app and the dashboard agree and the follow-up clock resets.
- Record who made each change (see DEV-7).

**Done when**
- An admin's changes save and appear in the app, and an admin can't change another church's data.

---

### QW-11 · Show when the data was last loaded, with a refresh button

Labels: dashboard, shared, size:S
Milestone: 2. Quick wins and bugs
Number: #60

**Body**

**Why**
The dashboard seems to load its data once per session, so changes made in the app since then don't show. Clergy can't tell how fresh the numbers are.

**What to do**
- First, find out how and when the dashboard loads its data, and how long it's kept. Record it in the issue.
- Show "Last updated [time]" in the top bar, in plain words ("Last updated 5 minutes ago").
- Add a "Refresh" button that reloads the data for every page.
- Keep the data no older than a sensible limit, for example by reloading when someone comes back to the tab after a while.

**Done when**
- Clergy can always see how fresh the numbers are, and get the latest with one click.

---

### DEV-14 · Sync VineMe users into ChurchSuite

Labels: dashboard, needs-dev, settings
Milestone: 6. Dev backlog
Number: #64

**Body**

**Why**
Churches want people who join through VineMe to appear in their ChurchSuite database. The Settings page already says this is coming (QW-2). It replaces DEV-5, which planned to sync groups for church websites and is closed while that's rethought.

**What to do**
- Agree what syncs: which people, which fields, and whether it's one-way (VineMe to ChurchSuite).
- Start from what already exists, and check whether it works: the `trigger_sync_churchsuite_contact` trigger on `users` (it calls the `create-churchsuite-contact` edge function when someone's church is set), `users.churchsuite_id`, the `churchsuite_connections` table (with tags for matched, VineMe and vulnerable people) and `services.churchsuite_site_id`. One church has a connection today; no one at the 6:30pm Evening Service has a `churchsuite_id` yet.
- Keep ChurchSuite credentials on the server. They should never reach the browser.
- Replace the "Coming soon" panel in Settings with the real connection settings.

**Done when**
- A church can connect ChurchSuite from Settings, and people who join through VineMe appear in its ChurchSuite database.

---

### QW-12 · One page layout: consistent spacing and alignment

Labels: dashboard, shared, size:S
Milestone: 2. Quick wins and bugs
Number: #67

**Body**

**Why**
Each page sets its own spacing and width, so they drift. The Groups map view has tighter top spacing than every other page (and the Groups cards view), so the heading jumps when you switch views. Settings and Profile are narrow and centred, while the other pages line up on the left.

**What to do**
- Add one shared page component, `components/dashboard/DashboardPage.tsx`, with the Groups map view's spacing (`py-4 lg:py-5`) and the standard width (`max-w-6xl`), plus a wider option for Groups.
- Use it on every dashboard page, including loading and error messages: Overview, Follow-ups, Groups (both views), Members, Reports, Settings and Profile.
- Settings and Profile use the standard width, so they line up on the left like the other pages; their forms keep their narrow width.
- Point the "Page container" rule in `app/dashboard/DESIGN.md` at the component.

**Done when**
- Every dashboard page has the same top spacing and left edge, set in one shared component.

---

### QW-13 · Follow-up drawer: open the member's drawer from their name

Labels: dashboard, shared, size:S
Milestone: 2. Quick wins and bugs
Number: #71

**Body**

**Why**
From a follow-up drawer there's no way to see the rest of the person: their other requests, contact details and bio. QW-5 added the opposite direction, a Review button in the member drawer that opens a request's follow-up drawer.

**What to do**
- Make the person's name in the follow-up drawer's header clickable, opening their member drawer. Reuse `MemberSheet`; don't build a second one.
- Load the member by the follow-up's `userId`, using the same member query as the Members page.
- Make it work wherever the follow-up drawer opens: the Follow-ups page, and Review from the member drawer. When it was opened from the member drawer, clicking the name goes back to that drawer rather than stacking another one.
- Make it clear the name can be clicked (underline or pointer on hover) and reachable with the keyboard.

**Done when**
- Clicking the name in any follow-up drawer opens that person's member drawer.

**Depends on:** QW-5
