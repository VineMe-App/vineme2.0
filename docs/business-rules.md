# Business rules

> **Summary.** Product and privacy rules that aren't obvious from reading one file. Each one lists where it's enforced, so you can check it still holds. Several came from the 2025 Kiro specs (now in [archive/2025-kiro-specs/](./archive/2025-kiro-specs/)) and were checked against the code on the date below. The Clergy Dashboard's own rules are in [apps/web/docs/dashboard/glossary.md](../apps/web/docs/dashboard/glossary.md).

Last verified against code: 2026-11-21

## Groups & join requests

| Rule | Enforced in | Notes |
| --- | --- | --- |
| Requesting to join shares your contact details with the group's leaders. The app warns you before sending. | `apps/mobile/src/components/groups/GroupDetail.tsx` (`showJoinConsent`) | Changed from opt-in consent in Oct 2025. See [ADR-0006](./decisions/0006-join-requests-share-contact-details-by-notice.md) |
| Declining a join request **archives** it; it doesn't delete it. | `services/joinRequests.ts` → `archiveJoinRequest` | The 2025 spec said delete. The code is right. |
| Re-requesting a group reuses the old membership row and resets it to `pending` with `journey_status = null`. | `services/joinRequests.ts` | `created_at` is reset so it appears at the top of the leader's list |
| A group always keeps at least one leader. The last leader can't leave, and can't delete their account. | `services/groups.ts` (leave); `SOLE_LEADER` check in `delete_my_account` (initial schema migration) | |
| Creating a group makes the creator its leader, and the group starts as `pending` until a church admin approves it. | `services/groupCreation.ts` | Admins can approve, deny or close |

## Referrals

| Rule | Enforced in | Notes |
| --- | --- | --- |
| A referred person gets an auth account (with an invite email) and a `users` row in the referrer's church. `newcomer` is set unless they're marked as an existing member. | `supabase/functions/create-referred-user` | They haven't consented yet, and the row would sync to ChurchSuite once the rollout gate is lifted. See [security/data-protection.md](./security/data-protection.md) and [ADR-0010](./decisions/0010-separate-group-members-from-user-accounts.md) (Proposed) |
| Referral submissions are rate-limited. | `apps/mobile/src/utils/referralValidation.ts` (`ReferralRateLimiter`) | ⚠️ **Client-side only**: bypassable. _TODO: decide whether server-side limiting is needed_ |

## Notifications

| Rule | Enforced in | Notes |
| --- | --- | --- |
| Declining a friend request sends **no** notification, for privacy. | No `friend_request_declined` type exists in `services/notifications.ts` | Don't add one |
| Leaders get reminders about stale pending requests after 3 / 7 / 14 days. | `group-leader-reminder-notifications` | See [backend.md](./architecture/backend.md#join-request-lifecycle) |

## Safeguarding

| Rule | Enforced in | Notes |
| --- | --- | --- |
| The vulnerable flag is owned by ChurchSuite. | `sync-churchsuite-vulnerable-tags` | [ADR-0005](./decisions/0005-churchsuite-source-of-truth-for-vulnerable-flag.md) |

Open safeguarding questions (who sees contact details and when, vetting, under-18s) are in [security/safeguarding.md](./security/safeguarding.md).

## Mobile code rules (from the original app spec, still followed)

- Screens never query Supabase directly. Go through `src/services/` and hooks.
- Server state in React Query, UI state in Zustand.
- Config through `EXPO_PUBLIC_*` env vars in `app.config.ts`.

Adding a rule: one row, with where it's enforced. If you can't point to code that enforces it, it's a wish, not a rule. Open an issue instead.
