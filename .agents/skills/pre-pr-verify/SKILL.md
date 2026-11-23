---
name: pre-pr-verify
description: >-
  Use before committing, pushing, or opening or updating a pull request in VineMe
  to run scoped lint, typecheck, test, build, and database checks.
---

# Pre-PR Verify

Run the verification suite matching the scopes touched in your branch and confirm PR readiness before opening or updating a pull request.

## Steps

1. **Check branch and diff hygiene**
   - Confirm you are not on `dev` or `main` and that the branch name follows `<type>/<issue>-<short-slug>` (or `<type>/<short-slug>`) in lowercase kebab-case:
     ```bash
     git branch --show-current
     ```
   - Review `git status --short` and `git diff --stat` to verify there are no stray files, `.env` secrets, or unintended out-of-scope edits.

2. **Run checks for each touched scope**
   Check `.github/workflows/test.yml` expectations plus local-only checks (`typecheck:mobile` and `db:reset`):

   - **`apps/web` or `packages/shared` changed:**
     ```bash
     npm run lint:web
     npx --workspace=@vineme/web next typegen
     npm run typecheck
     npm run build:web
     ```
   - **`apps/mobile` or `packages/shared` changed:**
     ```bash
     npm run lint:mobile
     npm run typecheck:mobile
     npm run test:unit
     ```
     *(If auth, referral, or service flows changed, also run `npm run test:integration` and `npm run test:e2e`.)*
   - **`supabase/` changed:**
     ```bash
     npm run db:reset
     ```
     Verify `WITH (security_invoker = true)` on new/updated views, church/service-scoped RLS on new tables, and that `packages/shared/src/database.types.ts` (via `npm run db:types`) and `packages/shared/src/database.ts` are up to date.
   - **Formatting (when `.ts`/`.tsx` files changed):**
     ```bash
     npx prettier --check <changed-files>
     ```

3. **Security review of the diff (when sensitive areas changed)**
   If the branch touches `supabase/` (migrations, RLS, views, functions, storage, Edge Functions or `config.toml`), auth or sign-in flows, `apps/web` route handlers or server actions, service-role or secret key use, env vars, `apps/mobile` storage or deep links, dependencies, or `.github/workflows/`, follow the `security-audit` skill in guidance mode against `git diff origin/dev...HEAD`, using only the matching topic checklists.
   - If nothing turns up, say "security review: no issues" in your report.
   - If something does, stop before opening or updating the PR and tell the user directly. Don't describe it in commits, the PR title or body, or PR comments; follow the skill's rules on where findings go.

4. **Confirm PR checklist and report results**
   - Verify the target base branch is `dev` (Squash and merge) for feature/fix PRs, or `main` (Merge commit) for `dev` → `main` releases.
   - Verify the PR title follows `<type>(<scope>): <concise summary> (#<number>)` and the body completes `.github/PULL_REQUEST_TEMPLATE.md` (`Closes #<number>`).
   - Report the exact commands executed and their observed pass/fail output.
