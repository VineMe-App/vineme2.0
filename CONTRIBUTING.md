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
   GitHub is configured to delete head branches automatically after a PR merges. Locally, prune stale tracking branches and remove merged local branches regularly:
   ```bash
   git fetch --prune
   ./scripts/cleanup-branches.sh --local
   ```

---

## Pull Request Guidelines

### PR Title Format
Because feature PRs are squashed into a single commit on `dev`, write clear, Conventional-Commit-style PR titles:

```text
<type>(<scope>): <concise summary> (<issue-ref>)
```

Examples:
- `feat(web,db): add request view for follow-ups (VineMe-App/vineme-website#15)`
- `fix(mobile): show reminder notification deep link (#337)`

### Linking Issues Across Repositories
- **Clergy Dashboard issues** live in `VineMe-App/vineme-website` so existing issue numbers stay intact. Always prefix them with the repo name:
  ```text
  Closes VineMe-App/vineme-website#15
  ```
  *(Plain `#15` in this repo resolves to `VineMe-App/vineme2.0#15`!)*
- **Mobile / monorepo issues** live in `VineMe-App/vineme2.0` and use `#<number>` (e.g. `Closes #337`).

---

## Database Migrations (`supabase/`)

1. Never edit the remote/local database schema manually without creating a migration file.
2. Create a migration from the repo root:
   ```bash
   npm run db:migration:new <descriptive_name>
   ```
3. Test the full migration chain and `supabase/seed.sql` locally:
   ```bash
   npm run db:reset
   ```
4. Regenerate shared TypeScript database types when tables or views change:
   ```bash
   npm run db:types
   ```
5. **Security requirement**: Any Postgres view read by the dashboard or app must set `security_invoker = true` so Row-Level Security (RLS) policies apply per signed-in user/church.

---

## Pre-PR Verification

Run the checks relevant to the scopes you touched before opening or updating a PR:

```bash
npm run lint         # ESLint across mobile and web
npm run typecheck    # TypeScript check on packages/shared and apps/web
npm run test:unit    # Mobile unit tests
npm run build:web    # Production Next.js build
```

---

## Branch Protection & Repo Maintenance

### Repository Access
- **Collaborators only**: Pushing branches and creating Pull Requests are restricted to repository collaborators (`Settings → General → Features → Pull requests → Collaborators only`).

### Branch Protection Rules
- **`dev`**: Requires PR before merging, passing CI checks, conversation resolution, and blocks force-pushes/deletion (0 required approvals so verified solo/CI PRs can merge smoothly, admin bypass enabled).
- **`main`**: Same protections as `dev` plus **1 required approving review** (dismissing stale reviews on new pushes, admin bypass enabled).

To apply or re-sync these rules and repository merge settings via the GitHub CLI:

```bash
./scripts/setup-branch-protection.sh
```

### Cleaning Up Old Branches
Use [`scripts/cleanup-branches.sh`](./scripts/cleanup-branches.sh) to audit and clean up branches safely:

```bash
./scripts/cleanup-branches.sh --dry-run --local --remote-merged
./scripts/cleanup-branches.sh --local --remote-merged
./scripts/cleanup-branches.sh --dry-run --archive-stale
```

- `--local` deletes local branches already merged into `origin/dev`.
- `--remote-merged` deletes remote branches on `origin` already merged into `origin/dev`.
- `--archive-stale` tags unmerged remote branches older than 90 days as `archive/<branch>`, pushes the tags, and deletes the remote branches so nothing is lost.
