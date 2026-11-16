# VineMe Monorepo

- Mobile app (Expo / React Native): `apps/mobile` (`@vineme/mobile`)
- Website & Clergy Dashboard (Next.js): `apps/web` (`@vineme/web`)
- Shared types & constants: `packages/shared` (`@vineme/shared`)
- Supabase migrations, seed data & Edge Functions: `supabase/`

## Web & Dashboard work

@apps/web/AGENTS.md

- Before any dashboard task, read `apps/web/docs/dashboard/glossary.md` and use its words exactly.
- If a task depends on anything marked "Decision needed" in the glossary, stop and ask me rather than assuming the recommendation.
- Work on one GitHub issue at a time (`gh issue view <number> -R VineMe-App/vineme-website`). Reference dashboard issues in commits and PRs as `VineMe-App/vineme-website#<number>` so links and auto-closing point to the right repo. Don't fix things outside it; open a new issue instead.
- Database views, tables, and RLS changes for the dashboard belong in `supabase/migrations/` as tracked SQL migrations.
- Never invent data. If a field isn't in the database, say so rather than showing a placeholder.
- Once the request and person views exist, take numbers from them, never from new calculations in components.
- Reuse shared components (contact block, avatar, drawers) rather than building new ones.
- Red and green only ever mean needs attention and on track.

## Git & PR Workflow
See `CONTRIBUTING.md` for full details:
- Branch off `dev` using `<type>/<issue>-<short-slug>` (`feat`, `fix`, `chore`, `docs`, `refactor` in kebab-case).
- Target feature/fix PRs at `dev` (Squash and merge); only release `dev` → `main` via Merge commit.
- Reference Clergy Dashboard issues as `VineMe-App/vineme-website#<number>` and mobile/monorepo issues as `#<number>`.
- Keep schema/RLS changes in `supabase/migrations/` (`npm run db:migration:new`, `npm run db:reset`, `npm run db:types`), with `security_invoker = true` on dashboard views.
