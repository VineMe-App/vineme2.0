# VineMe Supabase (`supabase/`)

Shared Postgres schema, Row-Level Security (RLS), `seed.sql`, `config.toml`, and Edge Functions.

## Migrations

- Never edit remote or local database schemas manually; always create a tracked SQL migration from the repository root:
  ```bash
  npm run db:migration:new <descriptive_snake_case_name>
  ```

## Security & RLS

- **Views:** Every Postgres view queried by the app or dashboard must set `WITH (security_invoker = true)` so RLS policies apply per signed-in user and church.
- **Tables:** Enable RLS on all new tables and scope policies explicitly by church/service. Never leak data across churches.
- **Sensitive auth fields:** Never expose `auth.users` email addresses to client roles—read emails server-side only.

## Edge Functions (`supabase/functions/`)

- Register every new Edge Function in `supabase/config.toml`.
- If a function requires `verify_jwt = false` (e.g., cron triggers, webhooks, or internal triggers), include a comment in `supabase/config.toml` explaining how it authenticates requests instead.

## Verification & Shared Types

1. Test the full migration chain and `supabase/seed.sql` locally:
   ```bash
   npm run db:reset
   ```
2. Regenerate Supabase TypeScript types after schema or view changes:
   ```bash
   npm run db:types
   ```
   (`npm run db:types` writes `packages/shared/src/database.types.ts`; also update `packages/shared/src/database.ts` if shared model interfaces changed, then run `npm run typecheck` and `npm run typecheck:mobile`.)
