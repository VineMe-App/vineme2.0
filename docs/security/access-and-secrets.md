# Access and secrets

> **Summary.** Who can change the code and the production database, and how secrets are kept. Clients only ever hold the anon key; the service role key lives in Edge Function secrets and in one Vercel server route.

Last verified against code: 2026-11-24

## Repository

- `VineMe-App/vineme2.0` is **public**. _Decision needed: should it stay public?_
- Branch rulesets for `dev`, `main`, and branch naming are kept as code in `.github/rulesets/` and active on GitHub: no deletion, no force-push, changes through a pull request, required status checks (`test (20.x)`, `supabase-gate`, and `codeowner-gate`), GitHub Auto-Merge for Tier 1 PRs, and Code Owner review on Tier 3 paths (enforced by `codeowner-gate` when not authored by `@hugheshallettj` or `@tomoakley`).
- Only the 2 organization owners hold `admin` rights (for break-glass emergencies); all other collaborators hold `write` and cannot bypass rulesets or `CODEOWNERS`.
- Pull requests and branch creation are restricted to repository collaborators (`collaborators_only`).
- Full branch, risk-tier PR, and merge workflow: [CONTRIBUTING.md](../../CONTRIBUTING.md).

## Where secrets live

The complete list of variables per environment is in [guides/environment-setup.md](../guides/environment-setup.md). This table covers the secrets.

| Secret | Where | Used by |
| --- | --- | --- |
| Supabase anon key | `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Both apps. Public by design: RLS protects data |
| Supabase service role key | Edge Function secrets; `SUPABASE_SERVICE_ROLE_KEY` on Vercel | Edge Functions; `apps/web/app/api/contact/route.ts` (server only) |
| ChurchSuite | `CHURCHSUITE_*` Edge Function secrets; per-church secret in `churchsuite_connections`, read via RPC | ChurchSuite functions |
| SendGrid | `SENDGRID_API_KEY` (Edge Functions and Vercel) | Exports, contact form, missing-service email |
| Cron schedules and webhook secret | Supabase Vault | `pg_cron` jobs |
| Twilio | Supabase Auth settings | SMS codes |

Rule: the service role key must never be in a `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` variable, because those end up in the app bundle.

The full rules for contributors are in [CONTRIBUTING.md](../../CONTRIBUTING.md#secrets), and for agents in the root `AGENTS.md`.

Rule: AI tool and MCP configs (`.mcp.json`, `.cursor/mcp.json`, `.kiro/`) hold personal access tokens. They're gitignored. Set them up per developer with your own token, and never commit them.

## Environments

| Environment | Data |
| --- | --- |
| Local | `supabase start`, seeded from `supabase/seed.sql` (fake data) |
| Preview / staging | _TODO: confirm whether a separate Supabase project exists_ |
| Production | Real people's data. Hackathon contributors and new joiners should never need it |

## Checks to do

**Repo access** (Jacob, Olly)

- [ ] Remove people who have left (periodically audit collaborators).
- [x] Drop admin rights from anyone who doesn't need them (`VineMe-App` default permission set to `write`; only the 2 org owners keep break-glass `admin`).
- [x] Only contributors can create branches and PRs (`collaborators_only` PR policy + branch-naming ruleset).
- [x] Protect `dev` and `main` (rulesets active with `test (20.x)`, `supabase-gate`, and `codeowner-gate`).
- [ ] Decide whether the repo stays public.
- [x] Turn on GitHub secret scanning, push protection, and Dependabot ([`.github/dependabot.yml`](../../.github/dependabot.yml)).

**Secrets**

- [ ] No secrets in git history. Rotate anything that was ever committed.
- [ ] Share env vars through a secrets manager, not chat.

**Database**

- [ ] RLS on every table, with policies reviewed by someone other than their author.
- [ ] Service role key used server-side only (see the table above).
- [ ] Review the Metabase read-only user, which bypasses RLS, and who can reach Metabase, until Metabase is retired.
- [ ] Separate dev and production projects with fake seed data, so hackathon contributors never see real people.
- [ ] Named owners for running migrations against production. _TODO: name them._
- [ ] Confirm `dev-impersonate-user` can't run in production: it refuses only when `ENVIRONMENT` (or `APP_ENV`) is `production`, so check that secret is set on every non-dev project, or that the function isn't deployed there at all.
