# ADR-0007: Keep VineMe's own database rather than relying on ChurchSuite's

- **Status:** Proposed (agreed at the 21 Nov 2026 kickoff; reasoning needs filling in)
- **Date:** 2026-11-21
- **Deciders:** Olly, Jacob, Aonghas, Dan (kickoff session)
- **Scope:** db, integrations
- **Related:** [ADR-0008](./0008-churchsuite-contacts-only.md), [architecture/integrations.md](../architecture/integrations.md#churchsuite)

## Context

_Backfilled: the decision is already in the code. The kickoff asked for the reasoning to be written down so nobody has to ask "why didn't we just use ChurchSuite?"._

VineMe stores people, groups, memberships, join requests and follow-up history in its own Supabase Postgres database (`users`, `groups`, `group_memberships`, `group_membership_notes`). ChurchSuite is linked per church through `churchsuite_connections`, and VineMe pushes contacts and tags to it.

Known factors:

- ChurchSuite's API can't create groups (reported by the team at the kickoff; _TODO: confirm against ChurchSuite's API docs and link them_).
- Not every church uses ChurchSuite. Some are moving to Planning Center.
- The follow-up journey (stages, notes, reminders, the Clergy Dashboard) has no equivalent in ChurchSuite.

_TODO: confirm the original reasoning with Olly or Tom (for example: speed of building, offline needs, RLS control, cost)._

## Decision

VineMe keeps its own database as the system of record for groups, memberships and the follow-up journey. External church management systems are integrations, not the backend.

## Options considered

| Option | Pros | Cons |
| --- | --- | --- |
| Own database, sync out to ChurchSuite (chosen) | Full control of the journey data and RLS. Works for churches without ChurchSuite | Data is duplicated, and sync has to be kept correct |
| ChurchSuite as the backend | One source of truth for churches that use it | Its API can't create groups. Ties VineMe to one vendor. No home for journey data |

## Consequences

- **Good:** VineMe can support ChurchSuite, Planning Center or no church management system at all.
- **Trade-off:** contact data exists in two places, so privacy work (data map, deletion) has to cover both. See [security/data-protection.md](../security/data-protection.md).
