# Clergy dashboard: plan

Start here. This folder holds the plan for reworking the clergy dashboard (Overview, Follow-ups, Groups, Members, Insights and Settings). The work is tracked as GitHub issues in the [Clergy Dashboard Upgrades](https://github.com/orgs/VineMe-App/projects/19) project.

| File | What it's for |
| --- | --- |
| `README.md` | This plan: the problem, the order of work, and the decisions behind it. |
| `glossary.md` | The definitions and rules every page, query and label follows. Read it before any dashboard task. |
| `issues.md` | The source of the GitHub issues, with the issue number for each key. |
| `reference/` | Reference queries. `people.sql` applies the agreed definitions, `follow-ups.sql` is the follow-up query, and `followed-up-in-time.sql` holds the Team measures. |
| `decisions/` | One file per settled decision: what was decided and why. |
| `audit.md` | Written by AUD-1: where every number comes from, and what's wrong with it. |

## The short version

The dashboard's shape is right. Most of what feels wrong is the same word counting different things on different pages. Connected is 117 on Members, 155 on Reports and 182 in Metabase. There are also a few real bugs, and some data that was invented to fill the design, such as the pet tags.

- **The fix:** agree the definitions once, calculate the numbers once in the database, then work through the pages.
- **The work:** 56 GitHub issues in order, each sized for one Claude Code session and one commit. 44 are dashboard work, and 12 need app or backend work (labelled `needs-dev`). Two (FU-5 and POL-2) are parked.
- **Picking up work:** every issue stands on its own and says what it depends on. Take the next open issue in the current milestone.
- **If time is short:** the critical path is DEC-1, DEC-2, AUD-1, QW-1 and DATA-1 to DATA-3, then FU-1 and FU-2. That gets the numbers right and the page clergy act on into shape.

## Principles every change follows

These also sit at the top of `glossary.md`, so Claude Code reads them before every task.

1. **One set of definitions.** Every page, query and label uses the glossary's words, with no synonyms.
2. **Numbers are calculated once.** Two database views, one row per request and one per person, feed every page.
3. **Every number has a unit.** "30 people, 46 requests", never just "46".
4. **Now pages and an over-time page.** Overview, Follow-ups, Groups and Members show what needs doing now. Insights shows change over time. Each number lives in one place and other pages link to it.
5. **Red and green only mean needs attention and on track.** Stage colours are distinct from each other, but never red or green. The devs design a proper chart palette from the brand colours (DEV-10).
6. **Plain, warm words.** No pipeline, performance, effectiveness, workflow or onboarding. Headings work best as plain questions.
7. **Never show data the database doesn't hold.** If a field doesn't exist, leave it out.
8. **Build shared pieces once.** One contact block, one avatar and one drawer per thing, reused everywhere.
9. **Charts invite exploring.** Hovering shows the numbers behind a mark, clicking drills in, and views animate when they change rather than jumping.

## The order of work

1. **Decide and audit.** Settle the definitions, then audit every number on the dashboard without changing anything.
2. **Quick wins and bugs.** Small fixes that don't depend on the numbers. These can run alongside step 1.
3. **Data foundations.** Build the request and person views, and wire the dashboard to them. Everything after this reads its numbers from the views, which is why it comes before the pages.
4. **Pages.** Follow-ups first, because it's where clergy act. Then Members, Groups, Overview (after the pages it links to) and Insights.
5. **Polish.**

The dev backlog runs alongside all of it. The GitHub milestones match these steps. Issues #1 to #52 follow the list below, and later additions take the next numbers. `issues.md` has the exact number for each key.

Sizes: **S** is under an hour, **M** is a session of 2 to 3 hours, **L** is more than one session.

**1. Decide and audit**

- DEC-1 Agree the core definitions · S
- DEC-2 Agree the follow-up time rules and wording · S
- DEC-3 Agree how Insights measures things · S
- DEC-4 Agree the smaller product choices · S
- AUD-1 Audit every number and data point, read-only · M

**2. Quick wins and bugs**

- QW-1 Members list stops at 500 and search misses people · M
- QW-2 Settings: "Coming soon" over ChurchSuite · S
- QW-3 Overview: slimmer header, hide Invite user · S
- QW-4 Groups: tidy the cards and drawer · S
- QW-5 Drawers: tidy copy and remove dead buttons · S
- QW-6 Shared contact block with formatted phone numbers · S
- QW-7 Follow-ups: collapse group leader view by default · S
- QW-8 Overview chart: readable stage colours, after DEV-10 · S
- QW-9 Terms dictionary: one place in the code for every label, after DEC-2 · S

**3. Data foundations**

- DATA-1 Request view: one row per request, with stage and time limits · L
- DATA-2 Person view: one row per member · M
- DATA-3 Point the existing numbers at the views · M
- DATA-4 Email in the contact block, read on the server · M
- DATA-5 Keep Metabase usable until it's retired (Olly, in Metabase) · S

**4. Pages**

- FU-1 Follow-ups: explanation, time limits and totals at the top · S
- FU-2 Follow-ups: plain-language cards and colours · M
- FU-3 Follow-ups drawer: full history, leader contact, real archive reasons · M
- FU-4 Follow-ups: confirm before acting on a leader's behalf · M
- FU-5 Follow-ups: nudge on very old requests (parked) · S
- FU-6 Follow-ups drawer: clergy notes, with an "I've spoken to them" tick · M
- MEM-1 Members: top cards · M
- MEM-2 Members: table columns and status · M
- MEM-3 Members: person drawer · M
- MEM-4 Needs help: contact and resolve people who can't find a group · M
- GRP-1 Groups: count, filters and search · M
- GRP-2 Groups: badge and sort · S
- GRP-3 Groups: Active / Closed switch · S
- GRP-4 Groups drawer: open a member's drawer · S
- OV-1 Overview: four clickable cards · S
- OV-2 Overview: pending chart toggle · M
- OV-3 Overview: "This week" strip · S
- OV-4 Overview: who's waiting longest · M
- INS-1 Insights: rename, four tabs and page-wide filters · M
- INS-2 Insights: Activity tab · M
- INS-3 Insights: Results tab · L
- INS-4 Insights: Team tab · M
- INS-5 Insights: Groups scorecard · L

**5. Polish**

- POL-1 Tap a profile picture to enlarge it · M
- POL-2 Search across the dashboard (parked) · M

**Dev backlog** (alongside everything): DEV-1 to DEV-12, described under For the devs.

## How to work through it

One issue at a time, each on its own branch, in a fresh Claude Code session.

- Each issue gets its own branch from `staging`, linked to the issue, and is assigned to whoever is working on it.
- `CLAUDE.md` in the repo root holds the dashboard rules, so Claude Code reads them at the start of every session. One of them: if a task depends on anything marked "Decision needed" in the glossary, it stops and asks rather than assuming the recommendation.

**For each issue**

1. Start a fresh session with `/clear`. Use plan mode if the issue says so.
2. Paste the prompt below with the issue number.
3. Check the change in the browser.
4. When you're happy, Claude Code commits, pushes and opens a pull request into `staging`.
5. Merge the pull request (or ask a dev to review it first), then close the issue. GitHub only closes issues automatically for pull requests into `main`, so close it yourself or ask Claude Code to.

```text
Read docs/dashboard/glossary.md. Then work on issue <N> only:
1. Assign it to me: gh issue edit <N> --add-assignee @me
2. Create and check out a branch for it from staging: gh issue develop <N> --base staging --checkout
3. Do the issue. When you're done, tell me how to check it in the browser.
4. When I say OK, commit, push, and open a pull request into staging that mentions #<N>.
```

**When a decision is made:** update `glossary.md`, tick it in its decision issue, and close the issue once every box is ticked.

**When you spot something new:** keep it out of the current task, and open an issue for it.

## Decisions

All four decisions are settled. Each has a record in `decisions/` saying what was decided and why, and the definitions live in `glossary.md`.

| Decision | What it settled | Record |
| --- | --- | --- |
| DEC-1 | Who counts as a member, connected, plugged in, newcomer and needs help | `dec-1-definitions.md` |
| DEC-2 | Follow-up time limits, what resets the clock, follow-up states and card wording | `dec-2-follow-up-rules.md` |
| DEC-3 | The Insights page: the Results headline, and how the Team measures count requests | `dec-3-insights-measures.md` |
| DEC-4 | Invite user, group badges and sorting, search, the Members cards and how Insights is framed | `dec-4-product-choices.md` |

The audit (AUD-1) answers five data questions the work depends on: whether church_admin access shows the whole church or one service, how group status is stored, whether notes record who made a change, where archive reasons are defined, and whether unconfirmed emails can be read on the server.

## What's changing, page by page

**Overview**

- Slimmer header, with Invite user hidden for now.
- Four clickable cards: Needs help, Pending requests (with how many need attention), Groups at capacity ("5 of 18") and Total members. Each opens the matching filtered page.
- The pending requests chart gets readable colours and a toggle between stages and follow-up states. In the follow-up view, the groups needing the most attention move to the top.
- A "This week" strip: new requests, resolved requests and new sign-ups.
- The bottom list shows people with the most open requests, plus new sign-ups this week.

**Follow-ups**

- A short explanation of the three follow-up states (needs first contact, on track, needs attention), each stage's time limit shown on the page, and a total that ties back to Overview.
- Cards in plain words for each stage: "No contact in 8 days" in red, "Reached out 2 days ago" in green.
- Group leader view collapsed by default, with clearer stage headings.
- Drawer: formatted phone, email, contact for the leader, a full history of notes and stage changes, and the real archive reasons.
- Clergy can add notes, with an "I've spoken to them" tick that resets the clock.
- Admins can act on a leader's behalf after a confirmation, with an optional note.

**Groups**

- A count, filters (taking new members, at capacity) and search by group, leader, member or anyone who's asked to join. Searching for a person narrows the cards to their groups.
- Cards show every leader, no pet tags, and a short area instead of a full address.
- The badge shows how many requests need attention, and the groups needing the most come first. The Follow-ups group leader view uses the same order.
- An Active / Closed switch, with pending approval to follow.
- In the drawer, members open their own drawer, and "See stats" opens Insights for that group.

**Members**

- Fix the bug: the list stops at 500 and search misses people.
- Cards: All members, then Connected, Not yet connected, Archived and No requests, which add up to All members. Needs help and New in 30 days sit apart.
- Needs help: see who's asked, and mark them contacted or resolved, as the app does (MEM-4).
- Table: Signed up first, Newcomer or Existing member, a group count, and a status showing the furthest stage, other open requests, needs help and anything needing attention.
- Drawer: every request, including archived ones, each opening its follow-up; a notes history across all their requests; and, with DEV-12, notes about the person that aren't tied to a group.

**Insights (was Reports)**

- The page asks: how are people getting connected at your church?
- Four tabs: Activity, Results, Groups and Team. Newcomers becomes a filter across all of them.
- Activity: sign-ups and requests over time, by week, month or quarter.
- Results: the connected and plugged-in rates, and why requests were closed, including how long people waited before losing interest.
- Team: follow-up speed over time, counting each request only once its result is known, with an info button that explains how.
- Groups: "How are our groups doing?", a scorecard for spotting where to offer support. Clicking a measure shows it as a bar chart across groups.

**Settings**

- "Coming soon" over ChurchSuite until users can sync into it (DEV-14).

**Everywhere**

- Tap a profile picture to enlarge it.
- A proper chart colour palette, built from the brand colours by the devs, so stages are easy to tell apart.
- Each page's search covers that page only.

## For the devs

Twelve issues need work in the app or backend, beyond the dashboard. They're labelled `needs-dev` and sit in the Dev backlog milestone.

| Issue | What | Why it matters |
| --- | --- | --- |
| DEV-1 | Notify the leader when an admin adds a note | Otherwise clergy notes go unseen |
| DEV-2 | Notify the leader when an admin acts on their behalf | Leaders need to know their list changed |
| DEV-3 | Group approval flow | New groups approved from the dashboard and flagged on Overview |
| DEV-4 | Refer someone to a group | Re-refer after a poor fit, or place someone who asked for help. 12 requests so far were closed as "Not suitable" or "Group at capacity". |
| DEV-5 | ChurchSuite sync in Settings (closed) | Replaced by DEV-14. How groups appear on church websites is being rethought, probably not through ChurchSuite |
| DEV-6 | Invite someone to the dashboard | Brings back the Invite button, with the roles from DEV-9 |
| DEV-7 | Record who made each change, if missing | Separates leader actions from admin actions |
| DEV-8 | Group details as real fields, like pet friendly | Lets the dashboard show them honestly |
| DEV-9 | Rethink role-level access, with Aonghas | Service pastors see their own service; church pastors see the whole church and can drill into each service |
| DEV-10 | Chart colour palette, built from the brand colours | Four shades of pink can't be told apart. Worth doing early: QW-8 and the Insights charts use it |
| DEV-11 | A proper test-account flag | Matching "test" in names and emails can catch real people and miss real test accounts |
| DEV-12 | Notes about a person, not tied to a group | Notes only exist on group memberships today, so a general conversation with someone has nowhere to go |
| DEV-14 | Sync VineMe users into ChurchSuite | People who join through VineMe appear in the church's ChurchSuite database. Some of the sync already exists |

**Where to start.** Everything you need is in the issues, `glossary.md` and `audit.md` (once AUD-1 is done). Pick up the next open issue in the current milestone. Each issue says what it depends on.

## Things to keep in mind

- **Privacy.** The views must respect row-level security (`security_invoker`), or one church could see another's data. Emails from `auth.users` are read on the server only.
- **Small numbers.** A group with 2 requests at 100% outranks one with 25 at 40%. Always show the count beside a percentage.
- **Framing.** The scorecard is for spotting where leaders need support. They're volunteers.
- **Recent periods.** The current week, month or quarter hasn't finished. Mark it "in progress" so it doesn't look better or worse than it is.
- **Data hygiene.** Many requests from 2025 are probably resolved but never updated, such as King's Road's batch from last autumn. A one-off clean-up makes every number more trustworthy.
- **Metabase is being retired.** Until then it's a cross-check. Where the dashboard's definitions are better, the dashboard wins.
- **Claude Code fills gaps.** It invented the pet tags. The audit catches today's; the `CLAUDE.md` rules help stop new ones. Check anything that looks too neat.
