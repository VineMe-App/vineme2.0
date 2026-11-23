# ADR-0005: ChurchSuite is the source of truth for the vulnerable flag

- **Status:** Accepted (backfilled)
- **Date:** 2026-11-21
- **Scope:** db, integrations
- **Related:** PR #334 (issue #321), `supabase/functions/sync-churchsuite-vulnerable-tags`

## Context

_Backfilled: this context is reconstructed from the code and commit history. Add the original reasoning if you know it._

Churches already safeguard people in ChurchSuite, where admins tag contacts as "Vulnerable Person". VineMe needs the same flag (`users.is_vulnerable`) to change what it shows. If both systems could edit the flag independently, they would drift apart.

## Decision

ChurchSuite wins. A daily `pg_cron` job (`sync-churchsuite-vulnerable-tags-daily`) calls `sync-churchsuite-vulnerable-tags`, which sets `is_vulnerable` to match the tag for every user linked to ChurchSuite (`churchsuite_id` set). Users not linked to ChurchSuite are left alone. `mark-user-vulnerable` writes to both systems, so the next sync agrees.

## Consequences

- **Good:** church safeguarding workflows stay in the tool they already use.
- **Trade-off:** changes made in ChurchSuite take up to a day to reach VineMe (admins can trigger a per-church sync). Unlinked users depend only on VineMe-side flags.
