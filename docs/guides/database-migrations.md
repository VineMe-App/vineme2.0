# Database migrations

> **Summary.** Every schema, RLS, view, RPC, trigger and cron change is a tracked SQL file in `supabase/migrations/`. Never change a database by hand. CONTRIBUTING.md holds the workflow. This guide holds the detailed review checklist.

## Steps

Follow the steps in [CONTRIBUTING.md › Database Migrations](../../CONTRIBUTING.md#database-migrations-supabase) (create, `db:reset`, `db:types`). Then work through the checklist below before you open the PR.

## Checklist

- [ ] New tables: `ENABLE ROW LEVEL SECURITY` and policies scoped to the caller's church ([ADR-0004](../decisions/0004-rls-and-security-invoker-views.md)).
- [ ] New views: `WITH (security_invoker = true)`.
- [ ] `SECURITY DEFINER` functions check `auth.uid()` and set `search_path`.
- [ ] Cron schedules are read from Vault, like the existing `reschedule_*` functions. Don't hard-code project URLs or keys.
- [ ] Idempotent where you can (`IF NOT EXISTS`, `CREATE OR REPLACE`).
- [ ] Backward-compatible with live mobile builds (**Expand → Migrate → Contract**): `node scripts/check-migration-compat.mjs <migration_file>` passes (or intentional Contract-phase cleanups include `-- allow-breaking-migration: <reason>` with at least 10 characters).
- [ ] Docs updated per [maintaining-docs.md](../maintaining-docs.md#update-triggers-if-you-change-x-update-y) (ER diagram, status table, RPC table, background jobs).

## Don'ts

- Don't edit a migration that's been merged. Write a new one.
- Don't touch `supabase/migrations-archived/`.
- Don't put secrets in migrations.
