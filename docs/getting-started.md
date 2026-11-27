# Getting started

> **Summary.** The short, friendly route in. The aim is that a newcomer (at a hackathon, say) is making a useful change within an hour, not a day. This page points to the detailed docs rather than repeating them.

_This is a first draft. Whoever joins most recently should finish it, because they'll spot the gaps._

## 1. What VineMe is

VineMe is the front door to church community. It helps people find a group at their church, ask to join, and get followed up by the leaders until they belong.

## 2. Who uses it

| Who | What they do |
| --- | --- |
| **Searchers** (newcomers) | Find a group in the mobile app and ask to join, or get referred by a friend |
| **Group leaders** | Follow up requests: reach out, speak to them, see them attend, add them to the group |
| **Clergy and church admins** | Use the Clergy Dashboard (web) to see where people get stuck, and approve groups |

## 3. The repo in one picture

A mobile app (Expo) and a website with the Clergy Dashboard (Next.js) both talk to one Supabase backend, which syncs contacts to ChurchSuite. The diagram and details are in the [architecture overview](./architecture/README.md).

## 4. Run it locally

The commands are in the [root README](../README.md#getting-started). In short:

1. Clone the repo and run `npm install` at the root.
2. Copy `apps/mobile/.env.example` to `apps/mobile/.env` and `apps/web/.env.example` to `apps/web/.env.local`. What each variable is and where to get it: [environment setup](./guides/environment-setup.md).
3. Start the local database with fake seed data: `supabase start`, then `npm run db:reset`. Local sign-in uses the test OTPs in `supabase/config.toml`.
4. `npm run dev:mobile` or `npm run dev:web`.

_TODO: time this on a fresh machine and note anything that takes longer than 15 minutes._

## 5. Your first change

1. Pick an issue labelled "good first issue" (or file one using our issue forms). All issues, including the Clergy Dashboard's, are in this repo; how issues flow on `VineMe 3.0`, Slack, and Sentry is in [guides/team-workflow.md](./guides/team-workflow.md).
2. Branch off `dev` as `<type>/<issue>-<short-slug>` (see [CONTRIBUTING.md](../CONTRIBUTING.md)).
3. Ask Claude (or another agent) for help. Agents read the root `AGENTS.md` (Claude Code through `CLAUDE.md`), which points them at these docs. Project skills such as `implement-issue` and `church-data-protection` are in `.agents/skills/`.
4. Open a PR against `dev`.

**Using Claude:** Claude only shares projects within one organisation, so a shared Claude project won't work across personal accounts. That's why the context lives in the repo: everyone's Claude can read it here.

## 6. Rules that matter

- **Never use production data.** Work against the local database and seed data.
- **Don't share secrets** in chat or commit them. See [security/access-and-secrets.md](./security/access-and-secrets.md).
- **Safeguarding basics:** church and group membership is sensitive personal data. See [security/](./security/README.md).
- Schema changes only through migrations ([guide](./guides/database-migrations.md)), and every new view uses `security_invoker = true` ([ADR-0004](./decisions/0004-rls-and-security-invoker-views.md)).
- Read [business rules](./business-rules.md) before changing how groups, requests or referrals behave.

## 7. Words you'll hear

Connect group, request, journey status (reached out, spoken to, attended), plugged in, clergy, ChurchSuite. The meanings are in the [glossary](./glossary.md), and the Clergy Dashboard's stricter definitions are in [its glossary](../apps/web/docs/dashboard/glossary.md).

## 8. Who's who

| Person | Role / area |
| --- | --- |
| Olly | Refining the Clergy Dashboard; data model |
| Jacob | Clergy Dashboard; repo access |
| Dan | Clergy Dashboard; security audit |
| Aonghas | Contributor; docs and data model proposals |
| Tom | Development (mobile, notifications) |
| Esther | Design |

Jack may also join. _TODO: confirm one named person to ask per area, and how to reach them._
