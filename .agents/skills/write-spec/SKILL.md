---
name: write-spec
description: >-
  Use when turning a feature request, idea, or GitHub issue into a concise,
  testable VineMe specification before writing implementation code.
---

# Write Spec

Turn an issue or feature request into an implementation-ready specification grounded in VineMe's domain glossary, actual database schema, and security boundaries.

## Steps

1. **Gather context**
   - If tied to an issue, inspect it: `gh issue view <number>` (in `VineMe-App/vineme2.0`).
   - Read the scoped `AGENTS.md` for affected workspaces (`apps/mobile/AGENTS.md`, `apps/web/AGENTS.md`, `supabase/AGENTS.md`).
   - For Clergy Dashboard work, read `apps/web/docs/dashboard/glossary.md` and relevant records in `apps/web/docs/dashboard/decisions/`.
   - Inspect real schema and types in `packages/shared/src/database.ts` and recent `supabase/migrations/`. Never assume fields exist without verifying them.
   - **Blocker check:** If any requirement depends on something marked **"Decision needed"** in `glossary.md` or an unresolved product/schema choice, stop and list the decision(s) for the user instead of guessing.

2. **Draft the specification**
   Include these sections concisely:
   - **Goal**: What problem this solves and for whom.
   - **Scopes Touched**: Which of `apps/mobile`, `apps/web`, `packages/shared`, and `supabase/` are in scope.
   - **Domain Terms & Open Decisions**: Canonical terms used (matching `glossary.md`) and any open decisions blocking work.
   - **Acceptance Criteria**: Observable, testable criteria in `WHEN <trigger/condition> THEN <system> SHALL <behavior>` (or Given/When/Then) format.
   - **Non-Goals / Out of Scope**: What this change explicitly will not touch.
   - **Data, RLS & Privacy Impact**: Tables/views added or read, `WITH (security_invoker = true)` requirements, church/service RLS isolation, and server-only `auth.users` email rules.
   - **Task Breakdown**: Ordered implementation steps sized for one focused PR.
   - **Verification Plan**: Exact automated commands and manual/browser checks confirming each acceptance criterion.

3. **Confirm before coding**
   - Present the draft spec and any open questions for sign-off before editing application code.
   - Do not move or reorganize existing files in `docs/` or `.kiro/` unless explicitly asked.
