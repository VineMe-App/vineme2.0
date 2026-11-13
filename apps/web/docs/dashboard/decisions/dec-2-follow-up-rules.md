# DEC-2: follow-up time rules and wording

Decided 22 October 2026 by Olly. `glossary.md` is the source of truth from now on; this file records what was decided and why.

## Decisions

- **Time limits.** A pending request needs attention once more than 6 days pass with no first contact, 10 days at Reached out, 14 days at Spoken to, or 30 days at Attended without being added. The logic is the `follow_up` column in `reference/follow-ups.sql`.
- **What resets the clock.** A stage moving forward, whether a leader or clergy moves it, a status change, or a leader's note. Not contacted always counts from the request: only first contact stops that clock.
- **Clergy notes.** Clergy notes, once they exist (FU-6), get their own note type so they never reset the clock by themselves. The note form gets a tick box, "I've spoken to [name]". A ticked note resets the clock without changing the stage, because the person has had contact and hasn't been left hanging. It works at Reached out, Spoken to and Attended. A request that's still Not contacted stays on its first-contact clock until the leader makes contact.
- **Three follow-up states.** Needs first contact (not contacted, 6 days or fewer), On track (contacted, within the limit) and Needs attention (past the limit, at any stage). A request in its first 6 days isn't described as on track. "Overdue" and "Due in" go.
- **Attended, not yet added** keeps its own count, and anyone past 30 days is flagged as needing attention.
- **Stage 2 is "Spoken to"**, everywhere. "Invited" goes.
- **Card wording** is specific to the stage: "No contact in 5 days", "Reached out today", "Reached out yesterday", "Spoken to 2 days ago". The pill is green when on track and red when it needs attention. Cards don't show when the next contact is due; the page shows each stage's limit instead.
- **Very old requests:** parked. FU-5 is closed as not planned and can be reopened later.

Two details were filled in while writing this up, following the same pattern:

- Attended cards read like the others: "Attended 3 days ago".
- When a note or contact has reset the clock after the stage was reached, the card adds it ("Reached out 12 days ago, updated 3 days ago"), so a green pill never sits next to a date that looks past its limit.

## What changes

- `glossary.md`: the stage name, stage dates, the last-action rule, clergy notes, the follow-up states, card wording and colours.
- `reference/follow-ups.sql`: the `follow_up` column now holds the agreed logic, with the glossary's labels.
- Issues replaced: FU-1, FU-2, FU-4, DATA-1 and DATA-5. One addition to AUD-1. FU-5 parked. One new issue: FU-6.
- DATA-1 and DATA-5 also lose their instruction to exclude leaders' own memberships, since DEC-1 counts every membership.

## Issue updates

The entries below use the same format as `issues.md`.

### Replacements

---

### FU-1 · Follow-ups: explanation, time limits and totals at the top

Labels: dashboard, follow-ups, size:S
Milestone: 4. Pages
Number:

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
Number:

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

### FU-4 · Follow-ups: confirm before acting on a leader's behalf

Labels: dashboard, follow-ups, size:M
Milestone: 4. Pages
Number:

**Body**

**What to do**
- When an admin ticks a stage or archives a request, show a confirmation: "You're updating this on behalf of [leader name]", with an optional note.
- Save the change to `group_membership_notes` the same way the app does, so it resets the follow-up clock and shows in the history. AUD-1 says whether the dashboard does this today.
- Record in the history that an admin made the change.
- Save the optional note as a clergy note (FU-6).
- Notifying the leader is DEV-2, not this issue.

**Done when**
- No admin change happens without the confirmation, every stage change resets the clock, and the history shows who made it.

**Depends on:** AUD-1, FU-6 (for the note), and DEV-7 if AUD-1 finds changes don't record who made them

**Plan mode:** yes

---

### DATA-1 · Request view: one row per request, with stage and time limits

Labels: dashboard, data, size:L
Milestone: 3. Data foundations
Number:

**Body**

**Why**
Each page calculates its own numbers, so they disagree. One view, read by both the dashboard and Metabase, fixes that at the source.

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

### DATA-5 · Bring Metabase in line (Olly, in Metabase)

Labels: dashboard, data, size:M
Milestone: 3. Data foundations
Number:

**Body**

**What to do** (in Metabase, not Claude Code)
- Change the inner join on leaders to a left join. That's why the User-Requests bar shows 181 connected rather than 182.
- Add a "Not contacted" segment to the User-Requests bar.
- Fix the "Total Requests by Group" legend: its light grey is labelled "joined", but the same grey means "left" in the Total Requests donut.
- Fix the spoken-to measure in the per-person query: `spoken_within_sla` counts a request as a miss once it's 14 days old, but the limit is 16.
- Use the follow-up states from the glossary: Needs first contact, On track, Needs attention.
- Show year-on-year in points: "58% (73% last year)".
- Apply the test-account exclusion from the glossary.
- Once DATA-1 and DATA-2 exist, point the questions at the views.

**Done when**
- Metabase and the dashboard show the same numbers.

**Depends on:** DEC-1, DEC-3, DATA-1, DATA-2

---

### Additions

Add these two questions to the data questions in AUD-1 (step 5):

- When clergy tick a stage in the dashboard, is a `group_membership_notes` row written the same way the app does it? The follow-up clock and the history both depend on it.
- Does the drawer's "Add a note" save anything today, and with what `note_type`? If it saves as `manual`, clergy notes are already resetting the clock.

### Parked

FU-5 is closed as not planned, with this comment: "Parked by DEC-2. Reopen if very old requests become a problem."

### New issue

---

### FU-6 · Follow-ups drawer: clergy notes, with an "I've spoken to them" tick

Labels: dashboard, follow-ups, size:M
Milestone: 4. Pages
Number:

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

**Depends on:** AUD-1, DATA-1

**Plan mode:** yes
