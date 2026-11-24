# Environment setup

> **Summary.** Every environment variable, secret and database setting VineMe needs, where each one is set for each environment, and where to get its value. Start with [Local setup](#local-setup-from-scratch) if you're new. Rules for handling secrets are in [CONTRIBUTING.md](../../CONTRIBUTING.md#secrets).

Last verified against code: 2026-11-23

## Where values are set

| | Local | Preview / staging | Production |
| --- | --- | --- | --- |
| **Mobile** | `apps/mobile/.env` | EAS build `preview` profile. _TODO: confirm where EAS variables are stored (expo.dev project environment variables?); `eas.json` sets none for `preview` or `production`_ | EAS build `production` profile (same TODO) |
| **Web** | `apps/web/.env.local` | Vercel preview environment variables | Vercel production environment variables |
| **Edge Functions** | `supabase/functions/.env` (the Supabase CLI's default) | _TODO: confirm whether a staging Supabase project exists_ | Supabase dashboard → Edge Functions → Secrets, or `supabase secrets set` |
| **Database (Vault, settings)** | Created by migrations, overridden by `supabase/seed.sql` | Same TODO as above | Created by migrations; some set by hand (see [Database](#database-vault-secrets-and-settings)) |

`.env`, `.env.local` and `supabase/functions/.env` are gitignored. Only the `.env.example` files are committed, with placeholders.

## Local setup from scratch

1. Install dependencies at the repo root: `npm install`. You also need Docker and the Supabase CLI.
2. Start the local stack and load the schema and seed data:
   ```bash
   supabase start
   npm run db:reset
   ```
3. Run `supabase status`. It prints the local API URL and keys you need below. The API URL is `http://127.0.0.1:54321`.
4. **Mobile:** copy `apps/mobile/.env.example` to `apps/mobile/.env` and fill in the URL and anon key. On a physical phone, use your computer's LAN IP instead of `127.0.0.1`.
5. **Web:** copy `apps/web/.env.example` to `apps/web/.env.local` and fill in the URL and anon key. The contact form also needs the service role key and the SendGrid and contact variables; skip them unless you're working on it.
6. **Edge Functions** (only if you're working on them): copy `supabase/functions/.env.example` to `supabase/functions/.env`. See [Edge Functions](#edge-functions) for `CHURCHSUITE_WEBHOOK_SECRET`.
7. **ChurchSuite mocks** (only for ChurchSuite work): `docker-compose.yml` reads a root `.env` file, so create one (it can be empty) before `docker compose up churchsuite mocks`.
8. Sign in with a test phone number from `[auth.sms.test_otp]` in `supabase/config.toml`. Twilio isn't needed locally: its values in `config.toml` are placeholders.

Then run `npm run dev:mobile` or `npm run dev:web`.

## Mobile app

Variables starting `EXPO_PUBLIC_` are bundled into the app, so **anyone with the app can read them**. Never put a secret in one.

| Variable | Needed | What it's for | Where to get it |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Supabase API URL | Local: `supabase status`. Prod: Supabase dashboard → Project Settings → API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key. RLS protects the data | As above |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | For maps | Google Maps SDK key, injected at build time by `app.config.ts` and `plugins/withGoogleMapsApiKey.js` | Google Cloud Console. Restrict it to the app's package and bundle ID |
| `EXPO_PUBLIC_MAPBOX_TOKEN` | Optional | Address and place search (`services/location.ts`). Without it, search falls back to the device's geocoder (`expo-location`) | Mapbox account. Use a public `pk.` token, never a secret `sk.` one |
| `EXPO_PUBLIC_SENTRY_DSN` | Optional | Error reporting. Falls back to the DSN in `utils/globalErrorHandler.ts` | Sentry project settings |
| `EXPO_PUBLIC_ENABLE_PUSH` | Optional | `true` lets Android fetch a push token even without `google-services.json` | — |
| `APP_VARIANT` | Build | `development` builds the dev variant (`com.pilotlight.vineme.dev`, "VineMe (Dev)"). Set by the EAS `development` profile | — |
| `USE_EXPO_GO` | Optional | `true` drops native config that Expo Go can't use | — |
| `GOOGLE_SERVICES_JSON_2` | Android push | Path to `google-services.json`, provided as an EAS file variable | Firebase console. _TODO: confirm it's set in EAS_ |
| `DEBUG_GOOGLE_MAPS_PLUGIN` | Optional | `true` logs what the Maps config plugin does | — |

## Web app

Only `NEXT_PUBLIC_*` variables reach the browser. The rest are server-only and must never be renamed to `NEXT_PUBLIC_*`.

| Variable | Needed | What it's for | Where to get it |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase API URL | Local: `supabase status`. Prod: Supabase dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key | As above |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Error reporting. Falls back to the DSN in the Sentry config files | Sentry project `vineme-web` |
| `SUPABASE_SERVICE_ROLE_KEY` | Contact form | **Secret.** Server-only, used by `app/api/contact/route.ts` | Supabase dashboard → API. Local: `supabase status` |
| `SENDGRID_API_KEY` | Contact form | **Secret.** Sends contact-form email | SendGrid. _TODO: confirm who holds the account_ |
| `CONTACT_FROM_EMAIL` | Contact form | Sender address. The form returns an error without it | A SendGrid-verified sender |
| `CONTACT_NOTIFY_EMAILS` | Contact form | Who receives contact-form messages, comma-separated | — |
| `SENTRY_AUTH_TOKEN` | Vercel builds | **Secret.** Uploads source maps to Sentry (`next.config.ts`, org `vineme`) | Sentry → auth tokens |

## Edge Functions

Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to every function automatically, locally and in production. Don't set them yourself.

| Secret | Used by | What it's for |
| --- | --- | --- |
| `CHURCHSUITE_API_URL` | ChurchSuite functions | ChurchSuite API base URL. Locally, the Prism mock (`churchsuite` service in `docker-compose.yml`, port 4010 inside the Docker network, 8030 from your machine) |
| `CHURCHSUITE_AUTH_API_URL` | `_shared/churchsuite.ts` | ChurchSuite OAuth base URL. Locally, the Node mock (`mocks/src/churchsuite.js` serves `POST /oauth2/token` on port 8029). _TODO: confirm the exact local base path_ |
| `CHURCHSUITE_WEBHOOK_SECRET` | `create-churchsuite-contact`, `sync-churchsuite-vulnerable-tags` | **Secret.** Checks calls from database triggers and cron. Must equal the `edge_fn_webhook_secret` Vault value (below) |
| `SENDGRID_API_KEY` | `export-groups-csv`, `notify-missing-service` | **Secret.** Sends email |
| `EXPORT_FROM_EMAIL` | `export-groups-csv` | Sender for CSV export emails |
| `MISSING_SERVICE_FROM_EMAIL`, `MISSING_SERVICE_TO_EMAIL` | `notify-missing-service` | Sender and recipient for missing-service alerts |
| `ENVIRONMENT` (or `APP_ENV`) | `dev-impersonate-user` | **Production must set `ENVIRONMENT=production`.** The function refuses to run only when this is `production`; if it's unset, it runs. Locally, leave it unset or use `development` |

Per-church ChurchSuite credentials aren't env vars: a church admin enters them in the app, and they're stored in Vault through `create_churchsuite_connection` ([integrations.md](../architecture/integrations.md#connecting-a-church)).

**Getting `CHURCHSUITE_WEBHOOK_SECRET` locally.** The migration generates a random value in Vault. Read it and copy it into `supabase/functions/.env`:

```bash
supabase db query --local "select decrypted_secret from vault.decrypted_secrets where name = 'edge_fn_webhook_secret';"
```

`package.json` has a `webhook:sync-secret` script for this, but the file it runs (`scripts/sync-webhook-secret.sh`) isn't in the repo. _TODO: restore the script or remove the npm script._

## Database: Vault secrets and settings

The background jobs read these at run time. Migrations create them with production defaults, and `supabase/seed.sql` overrides some for local use.

| Name | Kind | Production default | Local override | Used by |
| --- | --- | --- | --- | --- |
| `edge_fn_webhook_secret` | Vault | Random, generated by the migration | — | ChurchSuite trigger and sync job. Must match `CHURCHSUITE_WEBHOOK_SECRET` |
| `edge_functions_base_url` | Vault | The production functions URL | `http://host.docker.internal:54321/functions/v1` | All trigger and cron calls to Edge Functions |
| `churchsuite_vulnerable_tags_sync_schedule` | Vault | `0 3 * * *` (daily, 03:00 UTC) | Every minute | Vulnerable-tag sync. Re-apply with `reschedule_churchsuite_vulnerable_tags_sync()` |
| `group_leader_reminder_notifications_schedule` | Vault | `0 9 * * *` (daily, 09:00 UTC) | _not overridden_ | Leader reminders |
| `app.settings.sb_secret_key` | Database setting | **Not set by any migration.** _TODO: confirm it's set in production, and how_ | Not set, so the reminder job logs a warning and skips | Reminder job and the push-notification webhook |

The production values may have been changed by hand since the migrations ran. Check in the Supabase dashboard (Vault, and Database → Cron) rather than assuming the defaults.

## Related

- [Access and secrets](../security/access-and-secrets.md): what's secret, and the security checks
- [Integrations](../architecture/integrations.md): each external service
- [Edge Functions guide](./edge-functions.md) · [Database migrations](./database-migrations.md)
