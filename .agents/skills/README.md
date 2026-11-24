# VineMe Agent Skills

Project-specific [Agent Skills](https://agentskills.io) for the VineMe monorepo (`@vineme/mobile`, `@vineme/web`, `@vineme/shared`, and `supabase/`).

## Cross-Agent Discovery

- **Canonical location:** `.agents/skills/` is natively discovered by Antigravity, Cursor, Codex, and other Agent Skills–compatible tools.
- **Claude Code compatibility:** `.claude/skills` is symlinked to `../.agents/skills`, so Claude Code discovers the exact same skills without duplicating files.

## Available Skills

| Skill | Purpose | Link |
| :--- | :--- | :--- |
| `write-spec` | Turn a feature request or issue into a concise, testable spec | [`SKILL.md`](./write-spec/SKILL.md) |
| `implement-issue` | End-to-end single-issue workflow from `dev` branch to PR | [`SKILL.md`](./implement-issue/SKILL.md) |
| `supabase-migration` | Safe SQL migrations, `security_invoker`, RLS, and shared type regen | [`SKILL.md`](./supabase-migration/SKILL.md) |
| `pre-pr-verify` | Scoped lint, typecheck, test, build, and DB verification before PR | [`SKILL.md`](./pre-pr-verify/SKILL.md) |
| `church-data-protection` | UK data protection & safeguarding checks for features touching personal data | [`SKILL.md`](./church-data-protection/SKILL.md) |
| `security-audit` | Security reviews and full audits: Supabase RLS & keys, Edge Functions, Next.js, Expo, secrets, auth, CI | [`SKILL.md`](./security-audit/SKILL.md) |

## Directory Structure

Each skill lives in its own lowercase, hyphenated directory:

```text
.agents/skills/<skill-name>/
├── SKILL.md          # Required: YAML frontmatter (name, description) + step-by-step instructions
├── scripts/          # Optional: helper scripts
├── references/       # Optional: detailed docs loaded on demand
└── examples/         # Optional: templates or reference examples
```

## `SKILL.md` Template

```markdown
---
name: my-skill-name
description: >-
  Concise description of what this skill does and when an agent should trigger it.
---

# My Skill Title

Clear, step-by-step workflow and verification steps.
```

- **`name`**: Lowercase letters and hyphens, matching the folder name.
- **`description`**: Used for progressive disclosure—only `name` and `description` are loaded up front, so be explicit about when the skill applies. Keep `SKILL.md` concise and put longer reference docs in `references/`.
