---
name: implement-issue
description: >-
  Use when picking up a single GitHub issue to implement end-to-end in VineMe,
  from reading the issue and branching off dev through verification and opening a PR.
---

# Implement Issue

Execute one GitHub issue end-to-end on a clean branch off `dev`, strictly within scope and backed by verified checks.

## Steps

1. **Read the issue and constraints**
   - Fetch the issue: `gh issue view <number>` (dashboard issues moved from `VineMe-App/vineme-website` to `VineMe-App/vineme2.0`; old links redirect).
   - Read root `AGENTS.md` and the scoped `AGENTS.md` for every area you will touch (`apps/mobile/AGENTS.md`, `apps/web/AGENTS.md`, `supabase/AGENTS.md`).
   - For dashboard work, read `apps/web/docs/dashboard/glossary.md` and use its exact terminology.
   - **Stop on blockers:** If the issue depends on an open **"Decision needed"** item or an unmerged prerequisite issue, stop and ask the user before proceeding.

2. **Create a clean branch off `dev`**
   ```bash
   git fetch --prune origin
   git checkout dev
   git pull origin dev
   git checkout -b <type>/<number>-<short-slug>
   ```
   Use lowercase kebab-case with `<type>` in `feat`, `fix`, `chore`, `docs`, or `refactor`.

3. **Implement strictly in scope**
   - Follow the issue's acceptance criteria and active spec. Do not fix unrelated issues in the same branch—offer to open a separate issue instead.
   - Never fabricate data, fields, or metrics not in the database.
   - If schema, view, or RLS changes are needed, follow the `supabase-migration` skill (`npm run db:migration:new`, `security_invoker = true`, `npm run db:reset`, `npm run db:types`).

4. **Verify before presenting**
   - Follow the `pre-pr-verify` skill for every touched scope (`apps/web`, `apps/mobile`, `packages/shared`, `supabase/`).
   - Provide concise manual or browser verification steps tied directly to the issue's acceptance criteria.

5. **Commit and open PR (only when approved)**
   - Confirm with the user before committing, pushing, or opening a PR.
   - Target `dev` (merged via **Squash and merge**).
   - Format the PR title as `<type>(<scope>): <concise summary> (#<number>)`.
   - Fill out `.github/PULL_REQUEST_TEMPLATE.md` and include `Closes #<number>`.
