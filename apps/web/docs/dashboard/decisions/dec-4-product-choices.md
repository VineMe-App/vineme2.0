# DEC-4: smaller product choices

Decided 29 October 2026 by Olly. `glossary.md` is the source of truth from now on; this file records what was decided and why.

## Decisions

- **Invite user** stays hidden for now (QW-3). It comes back with DEV-6, named after the roles from DEV-9, for example "Invite an admin". Not "colleague".
- **Group badges and order.** The badge on a group card shows how many of its requests need attention. Groups are listed with the most needing attention first, on the Groups page and in the Follow-ups group leader view.
- **The Overview chart** gets a toggle between stages and follow-up states. In the follow-up view, the groups needing the most attention move to the top, and the bars animate to their new places.
- **Search** is per page, with no global search. On the Groups page you can search by group, leader, member or anyone who's asked to join. Searching for a person narrows the cards to their groups, including ones they've asked to join. POL-2 is parked.
- **The Members cards**, in order: All members, then Connected, Not yet connected, Archived and No requests, which add up to All members. Needs help and New in 30 days sit apart, because they overlap the others.
- **How Insights is framed.** The page asks "How are people getting connected at your church?" The Groups tab asks "How are our groups doing?" and is about where to offer support, not a league table: the leaders are volunteers.
- **Charts invite exploring.** Hovering shows the numbers behind a mark, clicking drills in, and views animate when they change. On the Groups scorecard, clicking a measure opens a bar chart of it across groups.

## What changes

- `glossary.md`: the group badge, and a rule that charts invite exploring.
- `README.md`: the decisions section, and the page-by-page summary.
- Issues replaced: DEV-6, GRP-1, GRP-2, OV-2, MEM-1. Additions to INS-1 and INS-5. POL-2 parked.

## Issue updates

The entries below use the same format as `issues.md`.

### Replacements

---

### DEV-6 · Invite someone to the dashboard

Labels: dashboard, needs-dev, shared
Milestone: 6. Dev backlog
Number:

**Body**

**What to do**
- Let an admin invite another person to the dashboard, with one of the roles from DEV-9, so they only see what their role allows.
- Name the button after the roles, for example "Invite an admin". Avoid "colleague".
- Bring back the button hidden in QW-3 once it works.

**Done when**
- An invited person can sign in and sees only what their role allows.

**Depends on:** DEV-9

---

### GRP-1 · Groups: count, filters and search

Labels: dashboard, groups, size:M
Milestone: 4. Pages
Number:

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
Number:

**Body**

**What to do**
- The badge on each group card shows how many of its requests need attention, in red, replacing "X to follow up". If none need attention but some are pending, show the pending count in a neutral colour. No pending requests, no badge.
- Sort groups by requests needing attention, most first, then by pending requests. Change "busiest first" to match, for example "Groups needing the most attention first".
- Use the same order for the group leader view on Follow-ups.

**Done when**
- The badge and sort use the same numbers as Follow-ups, and both pages list groups in the same order.

**Depends on:** DATA-3

---

### OV-2 · Overview: pending chart toggle

Labels: dashboard, overview, size:M
Milestone: 4. Pages
Number:

**Body**

**What to do**
- Add a toggle to "Pending requests by group": By stage, or By follow-up state (needs attention, on track, needs first contact).
- In the follow-up view, sort groups by how many requests need attention, so the groups needing the most rise to the top. Animate the bars to their new places when the toggle changes, so the reshuffle is easy to follow.
- Hovering a bar segment shows its count. Keep "View as table".

**Done when**
- One click shows which groups have requests slipping, with those groups at the top.

**Depends on:** QW-8, DATA-3

---

### MEM-1 · Members: top cards

Labels: dashboard, members, size:M
Milestone: 4. Pages
Number:

**Body**

**What to do**
- Cards, in this order: All members; then Connected, Not yet connected, Archived and No requests, which add up to All members; then, set apart because they overlap the others, Needs help and New in 30 days.
- These replace the current cards (Connected, Pending follow-up, Looking for a group, New in 30 days). "Pending" describes requests, not people, so it isn't a card here.
- Each card filters the list, and the filter goes in the URL (for example `?filter=needs-help`) so Overview can link to it.

**Done when**
- The four middle cards add up to All members, and every card can be linked to.

**Depends on:** DATA-2

### Additions

Add this line to INS-1's "What to do":

- Give the page a heading question: "How are people getting connected at [church name]?"

Add these lines to INS-5's "What to do":

- Head the tab "How are our groups doing?", framed as where to offer support. It isn't a league table: the leaders are volunteers.
- Clicking a measure's column heading opens a bar chart of that measure across groups, sorted, with each bar showing its count. Clicking again closes it.

### Parked

POL-2 is closed as not planned, with this comment: "Parked by DEC-4: each page's search covers that page only. The Groups search (GRP-1) can find people."
