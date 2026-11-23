# Supabase: RLS, views, functions, storage

Anyone with the anon/publishable key can call PostgREST, RPC, storage and realtime directly, without the app. Judge every object by what a raw API call can do, not by what the UI shows.

## Tables
- [ ] RLS is enabled on every table in an exposed schema (`public` and any schema in `api.schemas` in `supabase/config.toml`). Check the latest migration state, not just the creating migration: a later migration may disable or replace policies.
- [ ] Each policy is scoped by church/service and role, for each command (`select`, `insert`, `update`, `delete`). A policy missing for a command means denied; a `using (true)` or `to public` policy means open.
- [ ] `update` policies have a `with check` that stops moving a row to another church or changing owner, role or status columns the user shouldn't control.
- [ ] `insert` policies stop users creating rows for other users or churches, or setting privileged columns (role, verified, vulnerable, approved).
- [ ] Policies that look up the user's church or role read from a table the user can't write to themselves. A policy that trusts `user_metadata` in the JWT trusts the user (they can edit it). `app_metadata` is only safe if nothing client-side can set it.
- [ ] Grants: check what `anon` and `authenticated` are granted beyond defaults, and whether new tables, sequences and functions are revoked where they shouldn't be public.
- [ ] Column-level exposure: a row a member may see can still hold columns they shouldn't (phone, email, notes, safeguarding flags). Check views or column grants are used where needed.

## Views
- [ ] Every view queried by the app or dashboard has `security_invoker = true`. A view without it runs as its owner and skips RLS.
- [ ] Views joining `auth.users` or other private tables don't return emails or private fields to client roles.

## Database functions (RPC)
- [ ] List every function in exposed schemas: all are callable via `/rpc/` by `anon` and `authenticated` unless execute is revoked.
- [ ] `security definer` functions check `auth.uid()` and the caller's church/role themselves, set `search_path` explicitly, and only return what the caller may see.
- [ ] Function parameters (church id, user id, group id) are checked against the caller, not trusted.
- [ ] Trigger functions that copy or derive data don't let a low-privilege write produce a privileged row.

## Storage
- [ ] Bucket public/private setting matches the content (avatars vs documents). Public buckets serve anything by URL.
- [ ] `storage.objects` policies scope by path (e.g. church or user id prefix) and check the caller owns that prefix on upload, update and delete.
- [ ] Upload size and content type limits are set where users upload.

## Realtime
- [ ] Tables in the realtime publication rely on RLS for who gets which change; broadcast/presence channels that carry personal data use private channels with authorization.

## Local checks
Use `npm run db:reset`, then call PostgREST/RPC locally as seed users from two different churches and roles (and as `anon`) and confirm each can only see and change what they should. Advisor output from `supabase db lint` / the Supabase security advisor is a starting list, not findings.
