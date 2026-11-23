# ChurchSuite integration

> **Summary.** VineMe matches or creates a ChurchSuite contact for each user, tags it, and takes the Vulnerable Person flag from ChurchSuite. Group membership stays in VineMe ([ADR-0008](../../decisions/0008-churchsuite-contacts-only.md)). **Before changing anything:** the contact sync is behind a temporary rollout gate and isn't live for churches yet.

- **Status:** Not live. The rollout gate in `create-churchsuite-contact` limits it to internal `@vineme.app` accounts, and the gate is staying for now.
- **Apps:** mobile admin, db, Edge Functions
- **Owner:** _TODO: confirm_
- **Last verified against code:** 2026-11-22

How each flow works step by step (connecting a church, contact sync, the vulnerable-tag reconciliation) is in [architecture/integrations.md](../../architecture/integrations.md#churchsuite). This page covers scope, status and open questions.

## What it does

| Capability | State | Where |
| --- | --- | --- |
| Connect a church (credentials, provision tags) | Built | `create-churchsuite-connection`, mobile `admin/churchsuite.tsx` |
| Map services to ChurchSuite sites | Built | `get-churchsuite-sites`, `link_service_to_churchsuite_site` |
| Match or create a contact on sign-up, without overwriting an existing contact's details | Built, behind rollout gate | `create-churchsuite-contact` (trigger on `users`) |
| Vulnerable Person flag, ChurchSuite wins | Built | `sync-churchsuite-vulnerable-tags` (daily `pg_cron`), [ADR-0005](../../decisions/0005-churchsuite-source-of-truth-for-vulnerable-flag.md) |
| Export groups and members as ChurchSuite import CSVs | Built | `export-groups-csv`, mobile `components/admin/ExportGroupsCsv.tsx` |
| Sync groups or memberships to ChurchSuite | Not planned | ChurchSuite's API can't create groups ([ADR-0008](../../decisions/0008-churchsuite-contacts-only.md)) |

## Data

`churchsuite_connections` (per-church credentials and tag IDs), `users.churchsuite_id`, `users.is_vulnerable`, `services.churchsuite_site_id`.

## Edge cases & gotchas

- Referred people get a `users` row with `church_id` set (see [referrals](../referrals/README.md)), so the contact trigger fires for them too. Once the gate is lifted, they'd be pushed to ChurchSuite before accepting anything. Whether that should happen is an open question in [ADR-0010](../../decisions/0010-separate-group-members-from-user-accounts.md).

## Open questions

- Does the existing CSV export cover what church offices need for their records, or does it need extending?
- What has to be true before the rollout gate is removed? _TODO: confirm the criteria and owner._

## Related

- ADRs: [0005](../../decisions/0005-churchsuite-source-of-truth-for-vulnerable-flag.md), [0007](../../decisions/0007-keep-own-database.md), [0008](../../decisions/0008-churchsuite-contacts-only.md)
- Planning Center is a possible future integration: [architecture/integrations.md](../../architecture/integrations.md#future-integrations)
