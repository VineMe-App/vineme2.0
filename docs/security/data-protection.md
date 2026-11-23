# Data protection (UK GDPR)

> **Summary.** What personal data VineMe holds, where it goes, and the data protection checks still open. Membership of a church or group reveals religious belief, which is special category data (UK GDPR Article 9), so every use needs both a lawful basis and an Article 9 condition.

Last verified against code: 2026-11-22

## Data map

A first draft from the schema. _TODO: add who can see each item (from RLS), the retention period and the lawful basis._

| Data | Where | Notes |
| --- | --- | --- |
| Phone number, email | `auth.users` (Supabase Auth) | Phone is the sign-in method ([ADR-0003](../decisions/0003-phone-first-authentication.md)) |
| Name, bio, avatar, gender | `public.users`, Storage (avatars) | `gender` added in `20260701190432_add_gender_to_users.sql` |
| Church and service | `users.church_id`, `users.service_id` | **Special category:** implies religious belief |
| Group memberships and join requests | `group_memberships` | **Special category** |
| Follow-up notes | `group_membership_notes` | Free text written by leaders and clergy, so it could contain anything |
| Needs help | `users.cannot_find_group*` | |
| Vulnerable person flag | `users.is_vulnerable` | Safeguarding data, owned by ChurchSuite ([ADR-0005](../decisions/0005-churchsuite-source-of-truth-for-vulnerable-flag.md)) |
| Referrals | `referrals`, plus an account created for the referred person | Entered by someone else, see below |
| Friends | `friendships` | |
| Push tokens, notifications | `user_push_tokens`, `notifications` | |
| Marketing preference | `users.marketing_opt_in` | |
| Focus Festival | `focus_festival.*` (tents, cars, applications) | Includes gender requirements for tents |
| ChurchSuite copy | ChurchSuite contacts | Created or matched by VineMe ([features/churchsuite](../features/churchsuite/README.md)) |

## Suppliers that process personal data

Each one needs a data processing agreement. _TODO: record whether each is in place, and each supplier's hosting region._

| Supplier | What it receives |
| --- | --- |
| Supabase | Everything (database, auth, storage). _TODO: confirm the project's region (UK or EU preferred)._ |
| Vercel | Web app traffic; the contact form passes through it |
| SendGrid | Email addresses and email content (exports, contact form, missing-service emails) |
| Twilio | Phone numbers (SMS sign-in codes) |
| Expo Push | Push tokens and notification text |
| Sentry | Error reports, which can include personal data |
| ChurchSuite | Contacts and tags |
| Metabase | Read access to the database while it's still in use. It's being retired |
| Mapbox | Address and place search text typed in the mobile app |
| Google (Maps SDK) | Map views in the mobile app. _TODO: confirm whether device location is sent_ |

## Checks to do

- [ ] Complete the data map above: who sees each item, how long it's kept.
- [ ] Lawful basis for each use, including the Article 9 condition for special category data.
- [ ] **Referrals:** someone entered by a friend hasn't consented. Today a referral creates their auth account, sends an invite email and creates a `users` row that would sync to ChurchSuite once the rollout gate is lifted ([features/referrals](../features/referrals/README.md)). Ties into [ADR-0010](../decisions/0010-separate-group-members-from-user-accounts.md).
- [ ] **Join requests** share contact details with leaders by notice, not stored consent ([ADR-0006](../decisions/0006-join-requests-share-contact-details-by-notice.md), still Proposed). Confirm this is covered by the privacy notice.
- [ ] **Account deletion** removes or anonymises everything about the person: `delete_my_account` and `delete-auth-user` in the database, plus ChurchSuite, Sentry and email logs.
- [ ] Privacy notice in the app and on any embed. The website's privacy policy is at `apps/web/app/legal/privacy-policy`.
- [ ] Data processing agreements with every supplier above.
- [ ] Check whether ICO registration is needed.
