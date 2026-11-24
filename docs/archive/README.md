# Archive

> **Not maintained. May be wrong.** These are implementation summaries from 2025, kept for historical context. Don't follow them as current guidance. Check `docs/architecture/` and the code instead.

Files are named `YYYY-<original-name>.md`. To retire a doc, `git mv` it here and remove it from every index. Never edit archived files.

The original Kiro feature specs from the same period are in [2025-kiro-specs/](./2025-kiro-specs/).

## Kiro specs

[`2025-kiro-specs/`](./2025-kiro-specs/) holds the original 2025 specs (moved from `.kiro/specs/` in November 2026). They were reviewed against the code on 2026-11-21. Anything still vital was moved into [business-rules.md](../business-rules.md) and [ADR-0006](../decisions/0006-join-requests-share-contact-details-by-notice.md).

| Spec | State | Watch out for |
| --- | --- | --- |
| `vineme-mobile-app` | Outdated | ⚠️ Says **email + password** auth. Auth is phone OTP ([ADR-0003](../decisions/0003-phone-first-authentication.md)). QR codes were never built. |
| `admin-features` | Done, then extended | ⚠️ Says join requests need **opt-in contact consent** and declines **delete** the record. Both changed (see business rules). |
| `enhanced-notifications` | Mostly built | ⚠️ `tasks.md` shows 25 open tasks, but triggers, deep linking and settings exist in code. The notification tests (12.x) really are missing. Don't re-implement from it. |
| `referral-system` | Built | Rate limiting is client-side only. |
| `styling-system` | Built | Superseded by `apps/mobile/src/theme/README.md`. |
