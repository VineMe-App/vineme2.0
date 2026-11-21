---
name: supabase-migration
description: >-
  Use when creating or changing Postgres tables, views, RLS policies, database
  functions, cron jobs, or Edge Functions in supabase/.
---

# Supabase Migration

Create safe, tracked SQL migrations with church/service Row-Level Security isolation and synchronized `@vineme/shared` types.

## Steps

1. **Scaffold a tracked migration**
   Never modify local or remote schemas manually. From the repository root:
   ```bash
   npm run db:migration:new <descriptive_snake_case_name>
   ```

2. **Author SQL safely**
   - **Views:** Add `WITH (security_invoker = true)` on every view queried by the app or dashboard so caller RLS policies apply.
   - **Tables & RLS:** Enable RLS (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`) on every new table and scope policies explicitly by `church_id` / `service_id` so churches cannot read or mutate each other's data.
   - **Private auth data:** Never expose `auth.users` email columns directly to client roles—read emails server-side only.
   - **Performance:** Add indexes on queried foreign keys and common filter columns.
   - **Dashboard calculations:** Cross-check view columns, stage logic, and dates against `apps/web/docs/dashboard/glossary.md` and `apps/web/docs/dashboard/reference/*.sql`.
   - **Edge Functions:** If pairing with a function in `supabase/functions/`, register it in `supabase/config.toml` and include a comment explaining the auth mechanism whenever `verify_jwt = false` is required.

3. **Validate locally**
   Run the full migration chain and `supabase/seed.sql` from scratch:
   ```bash
   npm run db:reset
   ```
   Verify view security options, RLS isolation between churches/roles, and expected row counts with targeted `supabase db query --local` checks.

4. **Regenerate and verify shared types**
   ```bash
   npm run db:types
   ```
   - `npm run db:types` updates `packages/shared/src/database.types.ts`.
   - Also update `packages/shared/src/database.ts` if shared TypeScript interfaces changed.
   - Verify downstream apps compile:
     ```bash
     npm run typecheck
     npm run typecheck:mobile
     ```
