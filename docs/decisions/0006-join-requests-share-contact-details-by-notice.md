# ADR-0006: Join requests share contact details by notice, not opt-in consent

- **Status:** Proposed (needs confirming: this records a change already in the code)
- **Date:** 2026-11-21
- **Scope:** mobile, db, privacy
- **Related:** commit `cbd4eaa` (2025-10-15) "remove contact_consent from insertion/mutation"; [`archive/2025-kiro-specs/admin-features/requirements.md`](../archive/2025-kiro-specs/admin-features/requirements.md) Requirement 4

## Context

_Backfilled: this context is reconstructed from the code and commit history. Add the original reasoning if you know it._

The 2025 admin-features spec made contact sharing **opt-in**: on a join request the user was asked whether they consented to share contact details, `contact_consent` was stored, and leaders could only contact users who said yes.

In October 2025 the `contact_consent` writes were commented out of `apps/mobile/src/services/joinRequests.ts`. The join prompt (`GroupDetail.tsx`) now says: *"The connect group leaders will be able to see your contact details when you request to join. Do you wish to send your join request?"* Sending the request therefore counts as agreement, and nothing records the user's choice.

## Decision

Sending a join request shares the requester's contact details with that group's leaders. The user is told this before they send. There's no separate opt-in and no stored consent flag.

## Consequences

- **Good:** leaders can always follow up, which the whole follow-up flow (and the Clergy Dashboard) depends on.
- **Trade-off:** no per-request record of consent. _TODO: confirm with whoever owns privacy/GDPR that the notice wording and the privacy policy (`apps/web/app/legal/privacy-policy`) cover this._
- **Rule:** don't reintroduce `contact_consent` or remove the notice without a new ADR.
