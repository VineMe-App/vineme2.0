# Auth and sessions

Supabase Auth settings (redirect URL allowlist, OTP expiry, rate limits, email confirmation, MFA) mostly live in the dashboard. `supabase/config.toml` shows local settings only. Anything not in the repo is **needs validation**.

- [ ] Magic links, OTP and password resets: redirect URLs come from a fixed allowlist; the app doesn't take a redirect target from the query string without checking it.
- [ ] Sign-in and OTP endpoints don't reveal whether an email or phone has an account beyond what Supabase itself does (custom "user not found" messages, referral or invite lookups).
- [ ] Phone-first and email verification flows can't be finished for someone else's number or email (the code is checked against the identity it was sent to).
- [ ] Roles and church membership come from the database or `app_metadata`, never `user_metadata` or client state.
- [ ] Changing role, church or "vulnerable"/"verified" flags is done server-side by someone allowed to, never by the user on their own record.
- [ ] Impersonation or "act as" features are admin-only, logged, clearly shown in the UI, and impossible in production unless deliberately allowed.
- [ ] Referral and invite flows: tokens are random, single-use, expire, and only grant what the inviter could grant. Accepting an invite doesn't let someone choose a different church or role.
- [ ] Account deletion removes or anonymises linked data as `church-data-protection` requires, and revokes sessions.
- [ ] Sign-out clears local sessions on web and mobile.
- [ ] Deep/universal links (`apps/web/docs/universal-links-host-files.md`) can't be used to deliver auth codes or tokens to another app.
