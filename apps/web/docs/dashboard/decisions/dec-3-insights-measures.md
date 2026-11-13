# DEC-3: how Insights measures things

Decided 29 October 2026 by Olly. `glossary.md` is the source of truth from now on; this file records what was decided and why.

## Decisions

- **The page is called Insights.**
- **The Results headline counts people:** of the people who requested, the share who are connected. On 22 October 2026 that was 182 of 259 (70%).
- **The Team measures only count a request once its result is known.** A request is judged on a stage when it reaches the stage (a hit if within the limit, a miss if not), when it's archived before reaching it (a miss, whatever the reason), or when the limit passes without reaching it (a miss). Until then it's left out, so slow requests don't drag the numbers down before they've had their chance, and nothing is assumed about requests still in progress.
- **Archived before a stage always counts as a miss**, even when the person withdrew. It's strict but simple to explain, and archiving can't be used to avoid a miss.
- **The Team tab gets an info button** that explains how requests are counted, with the table from the glossary.
- **Metabase doesn't have to match.** It's the reference until it's retired, but where the dashboard improves on a Metabase measure, the dashboard wins.

## Why

Metabase only counted requests that had reached a stage, so slow periods looked good: Q3 2026 showed 100% attended within 30 days, from 4 people out of about 15 requests. Under the new rule, every Q3 request is past 30 days and counts.

## What changes

- `glossary.md`: the counting rule, the Results headline and the page name.
- `reference/followed-up-in-time.sql`: the three measures, one row per request, with a commented summary by quarter.
- Issues replaced: INS-1, INS-3, INS-4, DATA-5. One addition to INS-5.

## Issue updates

The entries below use the same format as `issues.md`.

### Replacements

---

### INS-1 · Insights: rename, four tabs and page-wide filters

Labels: dashboard, insights, size:M
Milestone: 4. Pages
Number:

**Body**

**What to do**
- Rename the page from Reports to **Insights**, in the navigation and anywhere it's mentioned.
- Reduce six tabs to four: Activity (was Downloads), Results (was Pipeline and Connection), Groups and Team. Newcomers becomes a filter.
- Page-wide filters: Everyone or Newcomers (check it actually filters), a date range, and week, month or quarter. Put them in the URL.
- Headings as plain questions. No "pipeline", "effectiveness" or "performance".

**Done when**
- The page is called Insights, with four tabs, filters that apply everywhere, and no corporate words.

---

### INS-3 · Insights: Results tab

Labels: dashboard, insights, size:L
Milestone: 4. Pages
Number:

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
Number:

**Body**

**What to do**
- Three measures over time, counted from the request date: reached out within 6 days, spoken to within 16, attended within 30.
- Count requests as the glossary says: only once the result is known. The logic is in `docs/dashboard/reference/followed-up-in-time.sql`.
- Show how many requests each percentage is based on, and mark the current period as in progress.
- Show year-on-year in points: "58% (73% last year)".
- Add an info button ("How are these counted?") that opens the counting table from the glossary: reached in time is a hit; reached late, archived first or past the limit is a miss; still open within the limit isn't counted yet. Keep it short and in plain words.

**Done when**
- The numbers can't flatter themselves (a quarter with 4 attended out of 15 requests can't show 100%), and a clergy member can find out how they're counted without asking.

**Depends on:** INS-1, DATA-1

---

### DATA-5 · Keep Metabase usable until it's retired (Olly, in Metabase)

Labels: dashboard, data, size:S
Milestone: 3. Data foundations
Number:

**Body**

**Why**
Metabase is being retired once the dashboard replaces it. Until then it's a useful cross-check, but it doesn't have to match where the dashboard's definitions are better (DEC-3).

**What to do** (in Metabase, only what's worth doing before it's retired)
- Change the inner join on leaders to a left join, so the User-Requests bar shows 182 connected rather than 181.
- Fix `spoken_within_sla` in the per-person query: it counts a miss once a request is 14 days old, but the limit is 16.
- Fix the "Total Requests by Group" legend: its light grey is labelled "joined", but the same grey means "left" in the Total Requests donut.

**Done when**
- Metabase is good enough to cross-check against until it's switched off. Close this issue when it is.

### Additions

Add this line to INS-5's "What to do":

- The three measures use the same counting rule as the Team tab (INS-4), and show how many requests each one is based on.
