# DEC-1: core definitions

Decided 22 October 2026 by Olly. `glossary.md` is the source of truth from now on; this file records what was decided and why.

## The problem

The dashboard and Metabase gave different numbers for the same idea. Connected was 117 on Members, 155 on Reports and 182 in Metabase, and a fourth query gave 181. They disagreed because each counted something slightly different, and none of the definitions were written down.

## Decisions

- **Members** are everyone at the dashboard's church and service (`users.church_id` and `users.service_id`), leaders and admins included. Admins have `church_admin` in `users.roles`. Leaders have an active leader membership.
- **Test accounts** are excluded when the first name, last name or email contains "test", in any case. A proper flag would be safer (DEV-11).
- **Pending describes requests; Connected describes people.** An attended request is still pending until the leader adds the person or it's archived, but the person is already connected. So a person can be connected while their request is pending. That's expected.
- **Connected** means the person has at least one group membership at Attended (`journey_status` 3), whatever happened to it afterwards. This is the 182 in Metabase.
- **Everyone who has requested** is Connected, Not yet connected (their best request is still pending at Spoken to, Reached out or Not contacted) or Archived (every request archived before they attended). These add up to everyone who requested. The connection bar shows them, with Not yet connected split into its stages. Members who never requested are No requests.
- **Plugged in** is a measure, not a separate group: a connected person who was then added to the group (status `active`, or `inactive` if they've since left).
- **In a group now** (an active membership today) is a state, not a VineMe outcome, and is kept separate from both.
- **Every request goes through the journey.** The app only lets a leader add someone once they've reached Attended, so an added or left request should always be at stage 3. `reference/people.sql` counts anything else as a data error.
- **Newcomer** means they said during onboarding that they're looking for a group (`users.newcomer`). It separates people using VineMe to find a group from existing members recording a group they're already in. It doesn't mean new to church.
- **New** means signed up in the last 30 days. It's worked out, not stored.
- **Needs help** comes from the users table: `cannot_find_group`, with `_requested_at`, `_contacted_at` and `_resolved_at` timestamps. The app has a simple version (a list, mark contacted, mark resolved). The dashboard needs one too (MEM-4).
- **One dictionary:** `glossary.md` defines every term, and one terms file in the code holds every label (QW-9), so a term can be renamed in one place.

## Why the old numbers disagreed

| Number | Where | What it actually counts |
| --- | --- | --- |
| 182 | Metabase Total Users donut | The right number: members with at least one membership at Attended. Its "Connected" column was a different thing (any active membership), which added to the confusion. |
| 181 | Metabase User-Requests bar | One fewer, because it only counts groups that still have an active leader, and one leader is now inactive. |
| 155 | Reports page | Not known yet. AUD-1 finds out. |
| 117 | Members page | Worked out from the first 500 people only: the cards add up to exactly 500 (117 + 30 + 353). It can't be trusted until QW-1 is fixed. |

`reference/people.sql` gives the numbers under these definitions.

## What changes

- `glossary.md`: new Scope, People, Requests, Outcomes and Needs help sections.
- `reference/people.sql`: the reference query for the person view (DATA-2). It also counts any request that's added or left without reaching Attended, as a data error.
- QW-9 becomes the terms dictionary in the code.
- New issues: MEM-4 (needs help in the dashboard) and DEV-11 (a proper test-account flag).
- Open issues that still use the old words ("Not in a group yet", "Looking for a group", "Got to a group", "Stuck", "Pending" describing people, or "Connected" meaning in a group now) get re-worded to match the glossary.

## Issue updates

The entries below use the same format as `issues.md`. QW-9 replaces the existing entry; MEM-4 and DEV-11 are new.

---

### QW-9 · Terms dictionary: one place in the code for every label

Labels: dashboard, shared, size:S
Milestone: 2. Quick wins and bugs
Number:

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

### MEM-4 · Needs help: contact and resolve people who can't find a group

Labels: dashboard, members, size:M
Milestone: 4. Pages
Number:

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

**Done when**
- A clergy member can see everyone who needs help and mark them contacted or resolved, and the app shows the same state.

**Depends on:** DEC-1, DATA-2

**Plan mode:** yes

---

### DEV-11 · A proper test-account flag

Labels: dashboard, needs-dev, data
Milestone: 6. Dev backlog
Number:

**Body**

**Why**
Test accounts are excluded by matching "test" in the first name, last name or email. That can catch a real person (a surname like Testa) and miss test accounts with other names.

**What to do**
- Add an `is_test` flag to users, and set it for existing test accounts.
- Switch the views, the dashboard and Metabase to the flag, and update `glossary.md`.

**Done when**
- Test accounts are excluded by the flag everywhere.
