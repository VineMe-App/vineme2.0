# VineMe Monorepo

## Repository Map

- `apps/mobile` (`@vineme/mobile`) — Expo / React Native mobile app
- `apps/web` (`@vineme/web`) — Next.js website & Clergy Dashboard
- `packages/shared` (`@vineme/shared`) — Shared TypeScript database types & constants
- `supabase/` — Postgres migrations, `seed.sql`, `config.toml`, and Edge Functions

## Scoped Rules

Follow the scoped `AGENTS.md` for every area you touch:

- [apps/mobile/AGENTS.md](./apps/mobile/AGENTS.md) for mobile app changes
- [apps/web/AGENTS.md](./apps/web/AGENTS.md) for website & Clergy Dashboard changes
- [supabase/AGENTS.md](./supabase/AGENTS.md) for migrations, RLS, views, and Edge Functions

## Spec-Driven & Issue Discipline

- **One issue at a time:** Read the full issue before coding (`gh issue view <number>` in `VineMe-App/vineme2.0`; dashboard issues moved here from `VineMe-App/vineme-website` and old links redirect). Keep unrelated bugs out of the current PR—open a new issue instead.
- **Contract-first & honest data:** Follow the active spec and glossary terms for the feature. Never invent data, fields, placeholders, or metrics not backed by the database or spec.
- **Stop on open decisions:** If an implementation depends on an unresolved product or schema decision (such as anything marked **"Decision needed"** in `apps/web/docs/dashboard/glossary.md`), stop and ask rather than guessing.

## Git & PR Workflow

See [CONTRIBUTING.md](./CONTRIBUTING.md) for full details:

- Never commit directly to `dev` or `main`.
- Branch off up-to-date `dev` using lowercase kebab-case: `<type>/<issue>-<short-slug>` (or `<type>/<short-slug>` when not tied to an issue), where `<type>` is `feat`, `fix`, `chore`, `docs`, or `refactor`.
- Target feature/fix PRs at `dev` (**Squash and merge**); only release `dev` → `main` via **Merge commit**.
- Reference issues in PR titles and descriptions as `#<number>` (`Closes #<number>`).
- Run scoped verification checks before opening or updating a PR:
  - `npm run lint` (`lint:mobile` / `lint:web`)
  - `npm run typecheck` (shared + web) and `npm run typecheck:mobile` (mobile)
  - `npm run test:unit` (plus `test:integration` / `test:e2e` when relevant)
  - `npm run build:web` (when `apps/web` or `packages/shared` changed)
  - `npm run db:reset` and `npm run db:types` (when `supabase/` changed)

## Project Skills

Reusable workflows live in `.agents/skills/` (symlinked at `.claude/skills`):

- `write-spec` — Turn a feature request or issue into a concise, testable spec
- `implement-issue` — End-to-end single-issue workflow from `dev` branch to PR
- `supabase-migration` — Safe SQL migrations, `security_invoker`, RLS, and type regen
- `pre-pr-verify` — Scoped verification checks and PR checklist before opening a PR
- `church-data-protection` — UK data protection & safeguarding checks for any feature touching personal data
- `security-audit` — Security reviews and full audits (RLS, keys, Edge Functions, Next.js, Expo, auth, CI); findings stay out of the repo
