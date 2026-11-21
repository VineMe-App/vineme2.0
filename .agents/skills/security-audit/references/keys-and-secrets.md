# Keys and secrets

## Supabase keys
- The anon/publishable key is meant to be public. It ships in the web and mobile bundles. Its exposure is not a finding; what it can reach (see `supabase-rls.md`) is.
- The service-role/secret key bypasses RLS. It must only exist server-side: Edge Functions, Next.js server-only code, CI secrets.
- [ ] Search for service-role/secret key use and check every caller is server-only. In `apps/web`, the module should import `server-only` or otherwise never be reachable from a client component.
- [ ] Nothing secret uses a `NEXT_PUBLIC_` (web) or `EXPO_PUBLIC_` (mobile) prefix, or is set in `app.config.ts` `extra`, `eas.json` env, or anything bundled. Everything bundled is readable by anyone with the app.
- [ ] Code that uses a service-role client does its own authorization first (who is calling, which church), because RLS won't.

## Other secrets
- [ ] Third-party credentials (e.g. church management system API tokens, push, email/SMS, Sentry auth tokens) are stored server-side, encrypted or in Vault where stored per church, and never returned to clients.
- [ ] Per-church integration tokens can only be used for that church.
- [ ] No secrets in git history. If you find one: don't paste it anywhere; tell the team privately so it can be rotated. Rotation is required, deleting the commit isn't enough.
- [ ] `.env*` files with real values are gitignored; `.env.example` holds placeholders only.

## Leaks through logs and telemetry
- [ ] Tokens, keys, magic-link URLs, OTP codes and personal data don't reach `console.log`, Sentry (check `beforeSend`, breadcrumbs, request bodies, replay masking) or PostHog (event properties, autocapture, session replay masking).
- [ ] Error messages returned to clients don't include stack traces, SQL or internal ids beyond what the caller already has.
