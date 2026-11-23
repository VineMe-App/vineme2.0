# External integrations

> **Summary.** Every third-party call that needs a secret goes through an Edge Function. ChurchSuite is the biggest integration: VineMe creates or matches a ChurchSuite contact for each user, tags it, and treats ChurchSuite as the source of truth for the "Vulnerable Person" flag.

Last verified against code: 2026-11-22

Every variable, and where to set it per environment: [guides/environment-setup.md](../guides/environment-setup.md).

| Service | Used for | Called from | Secrets / env |
| --- | --- | --- | --- |
| **ChurchSuite** | Contact sync, tags, sites | Edge Functions + `_shared/churchsuite.ts` | `CHURCHSUITE_API_URL`, `CHURCHSUITE_AUTH_API_URL`, `CHURCHSUITE_WEBHOOK_SECRET`; per-church credentials in `churchsuite_connections` (secret stored securely, read via RPC) |
| **SendGrid** | Transactional email | `export-groups-csv`, `notify-missing-service`, web `app/api/contact/route.ts` | `SENDGRID_API_KEY`, `EXPORT_FROM_EMAIL`, `MISSING_SERVICE_FROM_EMAIL`, `MISSING_SERVICE_TO_EMAIL` |
| **Twilio** | SMS OTP | Supabase Auth (config) | Supabase Auth settings |
| **Expo Push** | Push notifications | `push-notify` | none (Expo push tokens in `user_push_tokens`) |
| **Sentry** | Error monitoring | mobile (`@sentry/react-native`), web (`@sentry/nextjs`) | DSN in app config |
| **Vercel Analytics** | Web analytics | `apps/web` | — |
| **Google Maps** | Maps in the mobile app | mobile (`react-native-maps`, config plugin) | `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (public, restrict by app ID) |
| **Mapbox** | Address and place search | mobile `services/location.ts` | `EXPO_PUBLIC_MAPBOX_TOKEN` (optional, public token) |
| **Metabase** | Legacy reporting; being retired in favour of the dashboard | external | — |

## ChurchSuite

Tags provisioned per church by `create-churchsuite-connection`:

- **VineMe (created):** VineMe created a new contact.
- **VineMe (matched):** VineMe linked to an existing contact.
- **Vulnerable Person:** applied manually by admins in ChurchSuite, or by `mark-user-vulnerable`.

### Connecting a church

```mermaid
sequenceDiagram
  actor A as Church admin
  participant M as Mobile admin screen
  participant EF as create-churchsuite-connection
  participant DB as Postgres
  participant CS as ChurchSuite
  A->>M: Enter ChurchSuite credentials
  M->>EF: invoke (admin JWT)
  EF->>DB: rpc create_churchsuite_connection (stores secret)
  EF->>CS: Create VineMe / matched / vulnerable tags
  EF->>DB: Save tag IDs on churchsuite_connections
  M->>EF: get-churchsuite-sites
  A->>M: Map each service to a site
  M->>DB: rpc link_service_to_churchsuite_site
```

### Contact sync (new user → ChurchSuite contact)

```mermaid
sequenceDiagram
  participant DB as Postgres (users)
  participant EF as create-churchsuite-contact
  participant CS as ChurchSuite
  DB->>DB: INSERT/UPDATE users with church_id set and churchsuite_id null
  DB->>EF: trigger_sync_churchsuite_contact (pg_net, webhook secret)
  EF->>CS: Search for a matching contact
  alt match found
    EF->>CS: Apply "VineMe (matched)" tag
  else no match
    EF->>CS: Create contact, apply "VineMe (created)" tag
  end
  EF->>DB: UPDATE users.churchsuite_id
```

Note: `create-churchsuite-contact` has a **temporary rollout gate** that limits it to internal `@vineme.app` accounts, so the contact sync **isn't live for churches yet**. The gate is staying for now. Scope and open questions: [features/churchsuite](../features/churchsuite/README.md).

The sync covers contacts and tags only. Group membership stays in VineMe ([ADR-0008](../decisions/0008-churchsuite-contacts-only.md)).

### Vulnerable Person sync

```mermaid
sequenceDiagram
  participant CRON as pg_cron (daily)
  participant EF as sync-churchsuite-vulnerable-tags
  participant CS as ChurchSuite
  participant DB as Postgres
  CRON->>EF: trigger_sync_all_churchsuite_vulnerable_tags (webhook secret)
  loop each connected church
    EF->>CS: GET contacts with Vulnerable Person tag
    EF->>DB: Set is_vulnerable to match, for linked users only
  end
```

ChurchSuite is the source of truth here. See [ADR-0005](../decisions/0005-churchsuite-source-of-truth-for-vulnerable-flag.md).

## Push notifications

```mermaid
sequenceDiagram
  participant SRC as App / RPC / reminder job
  participant DB as notifications table
  participant EF as push-notify
  participant EX as Expo Push
  participant D as Device
  SRC->>DB: INSERT notification
  DB->>EF: Database webhook
  EF->>DB: Read user_push_tokens
  EF->>EX: POST /api/v2/push/send
  EX-->>D: Push
```

## Local development

`docker-compose.yml` runs:

- `churchsuite`: a Prism mock of ChurchSuite's OpenAPI spec on `localhost:8030`.
- `mocks`: a Node mock server (`mocks/`) on `localhost:8029`.

Both join the `supabase_network_vineme2` Docker network, so local Edge Functions can reach them. Point `CHURCHSUITE_API_URL` at the mock when running functions locally.

## Future integrations

- **Planning Center:** may be needed, as some churches are moving to it from ChurchSuite. Not started. VineMe keeping its own database ([ADR-0007](../decisions/0007-keep-own-database.md)) is what makes a second church management system possible.
