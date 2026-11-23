<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Web & Clergy Dashboard Rules

- **Glossary contract:** Before any dashboard task, read `apps/web/docs/dashboard/glossary.md` and use its exact terminology—no synonym labels.
- **Open decisions:** If a task depends on anything marked **"Decision needed"** in the glossary, stop and ask rather than assuming the recommendation.
- **Database changes:** Database views, tables, and RLS changes belong in `supabase/migrations/` as tracked SQL migrations (see `supabase/AGENTS.md`), with `WITH (security_invoker = true)` on views.
- **No fabricated data:** Never invent data, fields, or placeholders. If a field isn't in the database, say so rather than fabricating it.
- **Single source of truth for numbers:** Once the request and person views exist, take numbers from them—never from new calculations in components.
- **Reuse shared UI:** Reuse shared components under `apps/web/components/` (contact block, avatar, drawers, `components/shared/`, `components/ui/`) rather than duplicating them.
- **Status colour rule:** Red and green only ever mean **needs attention** and **on track**.
- **Verification:** Before opening or updating a PR touching `apps/web` or `packages/shared`, run:
  ```bash
  npm run lint:web
  npx --workspace=@vineme/web next typegen
  npm run typecheck
  npm run build:web
  ```
