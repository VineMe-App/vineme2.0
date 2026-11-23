# Architecture Decision Records

An ADR records one significant technical decision: the context, what was chosen, and the consequences. ADRs are **append-only**. A decision changes only by writing a new ADR that supersedes the old one.

## When to write one

Write an ADR when a change:

- adds or replaces a framework, library, service or integration;
- changes how data is stored, secured (RLS, roles) or synced;
- sets a pattern others must follow (e.g. "all secrets go through Edge Functions");
- is expensive to reverse, or you'd expect someone to ask "why did we do it like this?" in six months.

Don't write one for bug fixes, refactors that keep behaviour, or copy and UI tweaks.

> **Product and definition decisions for the Clergy Dashboard** (what "connected" means, follow-up time limits…) stay in [apps/web/docs/dashboard/decisions/](../../apps/web/docs/dashboard/decisions/) as `dec-N-*.md`. This folder is for technical and architectural decisions.

## How

1. Copy [`../_templates/adr.md`](../_templates/adr.md) to `NNNN-kebab-case-title.md`, using the next number.
2. Set status to **Proposed** and open it in the same PR as the change (or before it, for discussion).
3. When the PR merges, set **Accepted** and add it to the index below.
4. To reverse a decision, write a new ADR and change the old one's status to `Superseded by ADR-XXXX`.

## Index

| ADR | Title | Status | Date |
| --- | --- | --- | --- |
| [0001](./0001-record-architecture-decisions.md) | Record architecture decisions | Accepted | 2026-11-21 |
| [0002](./0002-monorepo-with-npm-workspaces.md) | Monorepo with npm workspaces | Accepted (backfilled) | 2026-11-21 |
| [0003](./0003-phone-first-authentication.md) | Phone-first authentication with SMS OTP | Accepted (backfilled) | 2026-11-21 |
| [0004](./0004-rls-and-security-invoker-views.md) | Enforce access with RLS and `security_invoker` views | Accepted (backfilled) | 2026-11-21 |
| [0005](./0005-churchsuite-source-of-truth-for-vulnerable-flag.md) | ChurchSuite is the source of truth for the vulnerable flag | Accepted (backfilled) | 2026-11-21 |
| [0006](./0006-join-requests-share-contact-details-by-notice.md) | Join requests share contact details by notice, not opt-in consent | **Proposed** (confirm) | 2026-11-21 |
| [0007](./0007-keep-own-database.md) | Keep VineMe's own database rather than relying on ChurchSuite's | **Proposed** (add reasoning) | 2026-11-21 |
| [0008](./0008-churchsuite-contacts-only.md) | ChurchSuite sync is contacts only; group membership lives in VineMe | **Proposed** | 2026-11-21 |
| [0009](./0009-church-website-embed-for-group-discovery.md) | Offer a VineMe embed for church websites | **Proposed** | 2026-11-21 |
| [0010](./0010-separate-group-members-from-user-accounts.md) | Only create a user account when someone signs up themselves | **Proposed** (not agreed; for discussion) | 2026-11-21 |

0007–0009 record decisions agreed at the 21 Nov 2026 kickoff. They stay Proposed until the team confirms the wording and reasoning.

"Backfilled" means the decision was already in the code. The ADR records it after the fact, from what the code and comments show. If you know more of the original reasoning, add it to Context.
