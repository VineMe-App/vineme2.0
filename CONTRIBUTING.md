# Contributing to VineMe

Welcome! This repository is a monorepo containing the VineMe mobile app, website & clergy dashboard, shared types, and Supabase backend.

> [!NOTE]
> Although this repository is public, pushing branches and opening Pull Requests are restricted to repository collaborators.

---

## Monorepo Scopes

| Directory | Package | Commit / PR Scope | Description |
| :--- | :--- | :--- | :--- |
| `apps/mobile` | `@vineme/mobile` | `mobile` | Expo / React Native mobile app |
| `apps/web` | `@vineme/web` | `web` | Next.js marketing website & clergy admin dashboard |
| `packages/shared` | `@vineme/shared` | `shared` | Shared TypeScript database types & constants |
| `supabase/` | — | `db` | Postgres migrations, `seed.sql`, Edge Functions, `config.toml` |

---

## Branch Strategy

We use a **two-branch** workflow:

- **`dev`** — Default integration branch for all active development. Feature and fix branches start from `dev` and merge back into `dev`. Preview/staging web builds deploy from `dev`.
- **`main`** — Production release branch (live website & App Store / Play Store releases). Only updated via release PRs from `dev` → `main`.

> [!IMPORTANT]
> Never commit directly to `dev` or `main`. All changes go through Pull Requests.

### Independent Web & Mobile Releases (Why One Shared `dev` Branch)

We deliberately keep **one shared `dev` branch** across both apps rather than separate `dev-web` and `dev-mobile` branches. Both apps share one Supabase schema and generated TypeScript types ([ADR-0002](./docs/decisions/0002-monorepo-with-npm-workspaces.md)); splitting branches per app would cause constant schema drift and painful merges.

Instead, we decouple **merging code** from **releasing to users**:

- **Web (`apps/web`) deploys automatically** via Vercel when `dev` → `main` merges (mobile-only commits skip web rebuilds via Vercel's Ignored Build Step).
- **Mobile (`apps/mobile`) ships only on explicit store releases** (`eas build --profile production` / `eas submit` — `main` does not auto-publish OTA updates). Tag store releases (e.g. `mobile-v2.0.4`), and use a short-lived `release/mobile-x.y.z` branch off that tag only if an urgent store-review fix is needed while `dev` moves ahead.
- **Gate unfinished features with feature flags, not branches** (via `supaflag` / `useFeatureFlag` on mobile) so `dev` and `main` stay shippable for either app at any time.
- **Keep shared `supabase/` changes backward-compatible** with the currently live mobile app version (**Expand → Migrate → Contract**): add new views, tables, or nullable columns first; only drop/rename columns or tighten breaking RLS policies once older mobile builds are phased out.

---

## Branch Naming Rules

Always branch off `dev` using lowercase **kebab-case** in the following format:

```text
<type>/<issue>-<short-slug>
```

### Allowed `<type>` Prefixes

| Prefix | When to use |
| :--- | :--- |
| `feat` | New feature or enhancement |
| `fix` | Bug fix |
| `chore` | Tooling, dependency updates, repo maintenance, cleanup |
| `docs` | Documentation updates only |
| `refactor` | Code restructuring with no behaviour change |

### Examples
- `feat/15-data-1-request-view`
- `fix/337-reminder-notifications`
- `chore/branch-cleanup`
- `docs/contributing-guide`

If a piece of work is not tied to an issue number, omit `<issue>-` (e.g. `chore/branch-cleanup`). Avoid personal username prefixes (like `alice/...`) or vague names (like `fix-bug` or `minor-tweaks`).

---

## Keeping the Git Tree Clean

1. **Always start from an up-to-date `dev`**:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feat/15-data-1-request-view
   ```
2. **Sync your branch with `rebase`, not `merge`**:
   When `dev` moves forward while your branch is open, rebase instead of creating merge commits inside your feature branch:
   ```bash
   git fetch origin
   git rebase origin/dev
   ```
3. **Merge strategy**:
   - **Feature / fix PRs → `dev`**: Use **Squash and merge** so each PR lands as one clean, atomic commit on `dev`.
   - **Release PRs (`dev` → `main`)**: Use **Create a merge commit** (never Squash and merge) so `dev` and `main` share commit history and never diverge.
4. **Delete merged branches**:
   GitHub automatically deletes head branches after a PR merges (`delete_branch_on_merge`). Enable auto-pruning once locally so deleted remote branches disappear from your local refs on every `fetch`/`pull`:
   ```bash
   git config --global fetch.prune true
   ```
   Then clean up finished local branches (including squash-merged branches whose upstream is `[gone]`) anytime with:
   ```bash
   npm run git:clean
   ```

---

## Pull Request Guidelines

### PR Title Format
Because feature PRs are squashed into a single commit on `dev`, write clear, Conventional-Commit-style PR titles:

```text
<type>(<scope>): <concise summary> (<issue-ref>)
```

Examples:
- `feat(web,db): add request view for follow-ups (#421)`
- `fix(mobile): show reminder notification deep link (#337)`

### Linking Issues
- All issues, including Clergy Dashboard issues, live in `VineMe-App/vineme2.0`. Reference them as `#<number>` (e.g. `Closes #337`).
- Dashboard issues were moved here from `VineMe-App/vineme-website`, so they have new numbers. Old links redirect, but old `vineme-website#<number>` references in past commits and PRs use the old numbers.
- Blank issues are disabled; file new issues using the structured forms in `.github/ISSUE_TEMPLATE/` (*Feature / Spec*, *Bug Report*, or *Decision Needed*).

### Risk-Tiered PRs & Review Policy

PRs targeting `dev` are automatically classified by [`.github/workflows/pr-risk-tier.yml`](./.github/workflows/pr-risk-tier.yml) ([`scripts/classify-pr-risk.mjs`](./scripts/classify-pr-risk.mjs)) based on the files touched:

| Tier | Label | Paths | Merge & Review Rule (`dev`) |
| :--- | :--- | :--- | :--- |
| **Tier 1** | `risk:low` | **Only** `docs/**` (excluding `docs/.vitepress/**`), non-agent `**/*.md`, static assets, and test files (`__tests__`, `*.test.*`, `*.spec.*`) | **Auto-merges** (squash) once required CI checks pass (`test (20.x)`, `supabase-gate`, and `codeowner-gate`), on non-draft PRs to `dev` |
| **Tier 2** | `risk:medium` | Standard app/package code (`apps/web/`, `apps/mobile/`, `packages/shared/`), `AGENTS.md`, `CLAUDE.md`, `.agents/**`, and `docs/.vitepress/**` | Auto-merge **disabled**; author verifies behaviour on the Vercel Preview URL or Expo, then merges (0 extra code reviews required) |
| **Tier 3** | `risk:high` | Any path in [`.github/CODEOWNERS`](./.github/CODEOWNERS) (`supabase/`, auth, permissions, API routes, `.github/`, CI gate & classifier scripts) | Auto-merge **disabled**; **`codeowner-gate`** requires `@hugheshallettj` or `@tomoakley` to approve unless authored by one of them + required CI checks pass |

- **Escalation safety:** If a later push adds a Tier 2 or Tier 3 file, auto-merge is automatically disabled.
- **Releases (`dev` → `main`):** Auto-merge is never enabled on `main`. Release PRs require **1 approving review**, passing `test (20.x)`, `supabase-gate`, and `codeowner-gate`, and must use **Create a merge commit**.
- **Automated PR checks & project sync:** Every PR runs `test (20.x)` (lint, typecheck, mobile baseline gate, unit/integration/e2e tests, web build), `supabase-gate` (backward-compatibility linter + local DB security check), and `codeowner-gate` (enforcing Code Owner approval on Tier 3 PRs not authored by `@hugheshallettj` or `@tomoakley`), alongside Vercel Preview, Supabase Preview branching, automated Codex review, and automatic `VineMe 3.0` board triage ([`.github/workflows/project-triage.yml`](./.github/workflows/project-triage.yml)).
- **More workflow & release guides:** Issue forms, `VineMe 3.0` board triage, Slack/Sentry channels, and AI agents live in [docs/guides/team-workflow.md](./docs/guides/team-workflow.md); environment and release steps live in [docs/guides/deployment.md](./docs/guides/deployment.md).

---

## Secrets

This repository is public, and git history is permanent: deleting a file doesn't remove a secret from it.

- **Never commit secrets** (API keys, tokens, service role keys, passwords, private keys), including in comments, tests, docs or example commands.
- Keep them in `.env` / `.env.local` (gitignored), Supabase Edge Function secrets, Supabase Vault or Vercel env vars. Commit only `.env.example` files with placeholders.
- **Don't commit AI tool or MCP configs** (`.mcp.json`, `.cursor/mcp.json`, `.kiro/`). Set them up locally with your own token.
- Share secrets through a secrets manager, never in chat.
- **If you commit a secret by mistake:** revoke or rotate it at the provider first, then tell the team privately. Removing the commit isn't enough.

Where each secret lives: [docs/security/access-and-secrets.md](./docs/security/access-and-secrets.md).

---

## Database Migrations (`supabase/`)

1. Never edit the remote/local database schema manually without creating a migration file.
2. Create a migration from the repo root:
   ```bash
   npm run db:migration:new <descriptive_name>
   ```
3. Test the full migration chain and `supabase/seed.sql` locally, and check backward compatibility with live mobile builds (**Expand → Migrate → Contract**):
   ```bash
   node scripts/check-migration-compat.mjs supabase/migrations/<migration_file>.sql
   npm run db:reset
   ```
4. Regenerate shared TypeScript database types when tables or views change:
   ```bash
   npm run db:types
   ```
5. **Security requirement**: Any Postgres view read by the dashboard or app must set `security_invoker = true` so Row-Level Security (RLS) policies apply per signed-in user/church.

For the full pre-PR checklist (RLS, `SECURITY DEFINER` functions, cron, docs), see [docs/guides/database-migrations.md](./docs/guides/database-migrations.md).

---

## Documentation

Docs live in [`docs/`](./docs/README.md). Start at its README.

- **Update docs in the same PR as the code.** Use the "Update triggers" table in [`docs/maintaining-docs.md`](./docs/maintaining-docs.md) to find which docs your change affects.
- **Significant technical decisions** (new library or service, data ownership, auth/RLS patterns) need an ADR in [`docs/decisions/`](./docs/decisions/README.md). Open it as *Proposed* in the PR and set it to *Accepted* on merge.
- **Don't add** implementation summaries (`*_SUMMARY.md`, `final-*.md`). Put that history in the PR description.
- Docs-only changes use the `docs` branch prefix and the `docs` PR scope, e.g. `docs(db): document edge function deploys`.

---

## Pre-PR Verification

Run the checks relevant to the scopes you touched before opening or updating a PR:

```bash
npm run lint         # ESLint across mobile and web
npm run typecheck    # TypeScript check on packages/shared and apps/web
npm run test:unit    # Mobile unit tests
npm run build:web    # Production Next.js build
```

Also confirm the docs your change affects are updated (see [Documentation](#documentation)).

---

## Branch Protection & Repo Maintenance

### Repository Access
- **Collaborators only**: Pushing branches and creating Pull Requests are restricted to repository collaborators (`Settings → General → Features → Pull requests → Collaborators only`).

### Branch Protection Rules
- **`dev`**: Requires PR before merging, passing `test (20.x)`, `supabase-gate`, and `codeowner-gate` checks, conversation resolution, 0 baseline approvals (so Tier 1 auto-merge, Tier 2 self-merge, and Code-Owner-authored Tier 3 PRs work smoothly while requiring `@hugheshallettj` or `@tomoakley` approval on Tier 3 PRs by others), GitHub Auto-Merge enabled, and blocks force-pushes/deletion. Only the 2 organization owners hold break-glass `admin` bypass rights; all other collaborators hold `write`.
- **`main`**: Same protections as `dev` plus **1 required approving review** (dismissing stale reviews on new pushes, auto-merge disabled).
- **Branch naming (`Enforce branch naming convention`)**: Rejects remote branch creation outside `dev`, `main`, `feat/*`, `fix/*`, `chore/*`, `docs/*`, `refactor/*`, `release/*`, `revert-*`, and `dependabot/*`.

To apply or re-sync these rules, security settings, and organization/collaborator permissions via the GitHub CLI:

```bash
./scripts/setup-branch-protection.sh --sync-access
```

### Cleaning Up Old Branches
- **Automated remote cleanup**: A weekly GitHub Action ([`.github/workflows/stale-branches.yml`](./.github/workflows/stale-branches.yml)) automatically tags unmerged remote branches with no open PR and no commits for **30 days** as `archive/<branch>` and deletes the remote branch.
- **Local & manual cleanup**: Run `npm run git:clean` or [`scripts/cleanup-branches.sh`](./scripts/cleanup-branches.sh) to clean up finished branches safely:

```bash
npm run git:clean
./scripts/cleanup-branches.sh --dry-run --local --remote-merged
./scripts/cleanup-branches.sh --dry-run --archive-stale
```

- `--local` deletes local branches whose upstream is `[gone]` (e.g. after Squash & Merge) or already merged into `origin/dev`.
- `--remote-merged` deletes remote branches on `origin` already merged into `origin/dev`.
- `--archive-stale` tags unmerged remote branches older than 30 days as `archive/<branch>`, pushes the tags, and deletes the remote branches so nothing is lost.
