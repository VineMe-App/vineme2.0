# Maintaining the docs

These rules apply to everyone who changes the repo: developers and AI agents (Claude Code, Cursor, Kiro…). The root `AGENTS.md` (which `CLAUDE.md` imports) points agents here.

## Principles

1. **Docs describe the system as it is now.** History belongs in git, PR descriptions and ADRs, not in `*_SUMMARY.md` or `final-*.md` files. Don't create those.
2. **One place per fact.** Link to it rather than copying it. If two docs disagree, fix the one that isn't the canonical home (see the table below).
3. **Code is the source of truth, docs are the map.** Docs say *what is where* and *why*. Detailed behaviour lives in code comments (for example each Edge Function's header comment) and docs link to it.
4. **Never invent.** If you can't confirm something from code, config or a person, write `_TODO: confirm …_` instead of guessing. This covers URLs, project refs, schedules, owners and reasons.
5. **Docs change in the same PR as the code.** A PR that makes a doc wrong isn't finished.

## Where things go

| You're writing about… | Canonical home |
| --- | --- |
| How components connect, data flow, trust boundaries | `docs/architecture/*.md` |
| Why we chose X over Y (technical) | `docs/decisions/NNNN-*.md` (ADR) |
| Why the dashboard defines a word or rule a certain way | `apps/web/docs/dashboard/decisions/dec-N-*.md` |
| A product feature end to end | `docs/features/<feature>/README.md` (from `_templates/feature.md`) |
| How to do a task (set up, test, migrate, deploy) | `docs/guides/*.md` |
| Fixing a production problem | `docs/guides/runbooks/*.md` |
| Branching, PR titles, merge strategy, pre-PR checks | `CONTRIBUTING.md` (root) |
| Agent rules loaded every session | `AGENTS.md` (root, plus scoped `apps/mobile`, `apps/web`, `supabase`); each `CLAUDE.md` just imports its `AGENTS.md`. Keep them short and link into `docs/` |
| Reusable agent workflows | `.agents/skills/<name>/SKILL.md` (symlinked at `.claude/skills`) |
| A product or privacy rule ("X must never…") | `docs/business-rules.md`, with where it's enforced |
| A domain word | `docs/glossary.md` (dashboard terms: `apps/web/docs/dashboard/glossary.md`) |
| What's in phase 1 vs phase 2, the order of work | `docs/product/roadmap.md` |
| Personal data, suppliers, safeguarding, access, secrets | `docs/security/*.md` |
| Feature status (built / not live / not built / phase 2) | Status column of `docs/features/README.md`, plus the feature's own page |
| A component library or module's API | `README.md` next to the code |
| What one Edge Function or migration does in detail | Its header comment |

## Update triggers: if you change X, update Y

Agents: check this table before finishing every task.

| Change | Update |
| --- | --- |
| New / renamed / removed **Edge Function** | Edge Functions table in `architecture/backend.md`; diagrams in `architecture/integrations.md` if it calls an external service; the function's header comment |
| New **cron job, trigger or DB webhook** | "Background jobs" table in `architecture/backend.md` |
| New **table, status value or relationship** | ER diagram and status table in `architecture/backend.md`; `npm run db:types` |
| New **RPC called from an app** | RPC table in `architecture/backend.md` |
| New **view** | Check `security_invoker = true` (ADR-0004); note it in the feature doc |
| New **external service, env var or secret** | `guides/environment-setup.md` and the matching `.env.example`; `architecture/integrations.md`, the tech stack diagram in `architecture/README.md`, root `README.md` env section, `security/access-and-secrets.md`; if it receives personal data, the supplier table in `security/data-protection.md` |
| New **column or table holding personal data** | Data map in `security/data-protection.md` |
| Change to **who can see whom** (RLS, contact details, roles) | `security/safeguarding.md` + an ADR |
| New **route / screen group** | `architecture/mobile.md` or `architecture/web.md` |
| New **feature** | `docs/features/<feature>/README.md` + `features/README.md` index |
| New or renamed **doc page** | The folder's `README.md` index **and** the sidebar in `docs/.vitepress/config.mts`. Markdown outside `docs/` only becomes a page if it matches `EXTRA_PAGES` there. |
| Change to a rule in `business-rules.md` (e.g. privacy, who sees what) | `business-rules.md` + an ADR |
| Library, framework, pattern or data-ownership change | New ADR + update the affected architecture doc |
| New **dev command or setup step** | Root `README.md` and the relevant guide |
| Branch, PR, CI or release process change | `CONTRIBUTING.md`, `.github/PULL_REQUEST_TEMPLATE.md` |
| Something already documented is now wrong | Fix it in this PR. If it's out of scope, open an issue labelled `docs` |

## Conventions

- **File names:** `kebab-case.md`. Folder index files are `README.md`. ADRs are `NNNN-kebab-title.md`.
- **Every doc starts** with a `# Title`, then a `> **Summary.**` block of 1–3 sentences, then `Last verified against code: YYYY-MM-DD` for architecture and feature docs.
- **Summary docs:** every folder has a `README.md` that indexes its contents in a table with one line per file. Keep these indexes current. They are what agents read first.
- **Links:** use relative links (`../architecture/backend.md#auth`) so they work on GitHub and in editors.
- **Paths in prose:** backticks, relative to the repo root (`supabase/functions/push-notify`).
- **Length:** aim for under ~300 lines. Split by sub-topic before it grows past that.
- **Voice:** plain, present tense, second person for guides ("Run…"). UK English, to match the product copy.

## Viewing the docs site

`npm run docs:dev` serves everything in `docs/` (plus the dashboard docs and selected code READMEs) as a searchable site at http://localhost:5173, with Mermaid rendered. It's local and for developers only: don't deploy it publicly, because it describes security-sensitive internals. Config: `docs/.vitepress/config.mts`.

Two things to know when writing:

- Raw HTML in markdown is shown as text (`html: false`), so `<placeholder>` wording is safe. Use markdown, not HTML, for formatting.
- Write links relative to the source file, as you would for GitHub. The site rewrites them. Links to code files or folders open on GitHub.

## Mermaid diagrams

GitHub, the docs site, VS Code (with the Markdown Mermaid extension) and Cursor render ` ```mermaid ` blocks. Use the type that fits the question:

| Question | Diagram |
| --- | --- |
| What talks to what? | `flowchart LR` (use `subgraph` for boundaries) |
| In what order do calls happen? | `sequenceDiagram` |
| What states can a record be in? | `stateDiagram-v2` |
| How do tables relate? | `erDiagram` (core relationships only; migrations are the full truth) |
| Timeline or rollout | `gantt` or `timeline` |

Guidelines:

- One idea per diagram, roughly 15 nodes or fewer. Split rather than squeeze.
- **Fewer lines beat more detail.** Draw edges between groups (subgraphs), not between every pair of boxes. Put the detail in prose or a second diagram.
- Prefer `flowchart LR` for wide overviews (pages are read on desktop) and `TB` for processes.
- Layout engine: the docs site uses **ELK with straight lines** by default, which suits diagrams with groups and right-angle routing. ELK bin-packs boxes that have no edges, so chain a group's boxes with invisible links (`A ~~~ B ~~~ C`) to keep them in one tidy column (see the tech stack diagram in `architecture/README.md`). For a small layered picture where siblings should line up on one row, opt into dagre with front matter `config: { layout: dagre, flowchart: { curve: linear } }` (see Trust boundaries).
- Keep edge labels short (about 25 characters). Long ones wrap and get clipped.
- Label nodes with the **real name in code** (`push-notify`, `group_memberships`) so people can grep for them.
- Label edges with the mechanism (`pg_net`, `functions.invoke`, `JWT`).
- Put a sentence of prose before each diagram saying what it shows. Diagrams supplement the text, they don't replace it.
- Check that it renders in `npm run docs:dev` before committing (GitHub and VS Code use their own layout, so check the site, which is what the team reads). Use **Enlarge** on the diagram to inspect it at full size.

## Writing ADRs

See [decisions/README.md](./decisions/README.md). In short: copy the template, number it, set **Proposed** in the PR, then **Accepted** on merge. Never rewrite an accepted ADR. Supersede it with a new one.

Agents must **not** mark an ADR Accepted on their own. Draft it as Proposed and ask the developer to confirm the decision and the reasoning in Context.

## The archive

`docs/archive/` holds old implementation summaries for historical context. Don't update them, don't link to them as current guidance, and don't add to the folder except when retiring a doc. To retire a doc: `git mv` it to `archive/YYYY-<name>.md` and remove it from indexes.

## Planning specs (Kiro, plan docs)

Old specs (the 2025 Kiro specs in `docs/archive/2025-kiro-specs/`) and similar planning docs say what was *intended*. Once a feature ships, its `docs/features/` page and `business-rules.md` are the source of truth, and the spec is history. Don't implement from an old spec's `tasks.md` without checking the code first: task checkboxes are often out of date.

## Periodic review

Once per release (or monthly):

1. For each doc with `Last verified against code`, spot-check it against the code and bump the date, or fix it.
2. Re-run the inventory commands in `architecture/backend.md` (Edge Functions, RPCs, cron jobs) and reconcile the tables.
3. Check that every `_TODO: confirm_` has an issue, or resolve it.
4. Run `npm run docs:build`. It fails on broken internal links, so it doubles as the link checker.

An agent can be asked to do this with the prompt below.

## Prompts for agents

**After a code change:**

```text
Read docs/maintaining-docs.md. Look at the diff on this branch (git diff dev...HEAD).
Using the "Update triggers" table, list every doc that is now out of date, then update them.
Don't invent anything you can't see in the code. Use _TODO: confirm_ instead.
If the change is a significant technical decision, draft an ADR with status Proposed and ask me to confirm it.
```

**Doc audit:**

```text
Read docs/maintaining-docs.md and docs/README.md. For each file in docs/architecture/,
check every table and diagram against the current code (supabase/functions, supabase/migrations,
supabase/config.toml, apps/*). Report what's wrong as a list with file:line, then fix it in one commit.
Bump "Last verified against code" only on docs you actually checked.
```

**Documenting a feature:**

```text
Read docs/maintaining-docs.md and docs/_templates/feature.md. Write docs/features/<feature>/README.md
for <feature> by tracing the code from the entry screens through services, RPCs, tables and Edge Functions.
Include a user-journey flowchart and a sequence diagram for the main flow. Add it to docs/features/README.md.
```

**Inventory and status** (fills the Status column of `docs/features/README.md`):

```text
Read docs/maintaining-docs.md, docs/README.md and docs/features/README.md. Then read the migrations,
Edge Functions and main app and website code. For each feature area (group leader journey, Clergy
Dashboard, groups and join requests, referrals, ChurchSuite, notifications, church website embed,
auth and accounts), list each capability as Live / Not live / Not built / Phase 2, where it lives
in the code, and known gaps. Update the feature pages and the index. Write "Needs check" rather than
guessing. Then list docs that are out of date.
```

**Data model:**

```text
Read docs/maintaining-docs.md. From supabase/migrations, write docs/architecture/data-model.md:
a Mermaid erDiagram of every public table and relationship, then a section per table with its
purpose, key columns, what each status or enum value means, and which RLS policies apply. Flag every
table holding personal data and check it against the data map in docs/security/data-protection.md.
Move the ER diagram and status table out of architecture/backend.md and link to the new page.
Add the page to docs/README.md and the sidebar in docs/.vitepress/config.mts.
```

**Decisions from a meeting:**

```text
Read docs/maintaining-docs.md and docs/decisions/README.md. Read the attached meeting notes.
Draft one ADR per technical decision that was actually agreed, copying docs/_templates/adr.md and
numbering from the next free number. Set every one to Proposed; never Accepted. Put product
decisions in docs/product/roadmap.md and open questions in the relevant feature page under
"Open questions". Update the decisions index and the sidebar.
```

**Issues from priorities:**

```text
Using docs/features/README.md and docs/product/roadmap.md, draft GitHub issues for the top items.
Each issue: user story, acceptance criteria, files likely touched, and a "good first issue" label
where it suits a newcomer. All issues go to VineMe-App/vineme2.0. Show me the list before creating anything.
```
