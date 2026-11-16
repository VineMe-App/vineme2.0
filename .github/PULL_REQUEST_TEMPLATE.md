## Summary
<!-- What does this PR change and why? -->

## Linked Issue
<!-- For Clergy Dashboard issues (tracked in vineme-website), use: Closes VineMe-App/vineme-website#<number> -->
<!-- For mobile / monorepo issues (tracked here), use: Closes #<number> -->

## Scopes Touched
- [ ] `apps/mobile` (`mobile`)
- [ ] `apps/web` (`web`)
- [ ] `packages/shared` (`shared`)
- [ ] `supabase/` (`db` — migrations, functions, or seed)
- [ ] Docs / Tooling (`docs` / `chore`)

## Database & Security Checklist (if `supabase/` changed)
- [ ] Tracked SQL migration added in `supabase/migrations/` (not run manually)
- [ ] Tested locally with `npm run db:reset`
- [ ] New views use `security_invoker = true` and RLS policies restrict cross-church access
- [ ] Shared types updated (`npm run db:types`) if schema changed

## Verification
- [ ] `npm run lint` (or scoped lint for touched app)
- [ ] `npm run typecheck`
- [ ] `npm run build:web` (if `apps/web` or `packages/shared` changed)
- [ ] `npm run test:unit` (if `apps/mobile` changed)
