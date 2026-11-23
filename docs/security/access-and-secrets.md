# Access and secrets

> **Summary.** Who can change the code and the production database, and how secrets are kept. Clients only ever hold the anon key; the service role key lives in Edge Function secrets and in one Vercel server route.

Last verified against code: 2026-11-22

## Repository

- `VineMe-App/vineme2.0` is **public**. _Decision needed: should it stay public?_
- Branch rules for `dev` and `main` are kept as code in `.github/rulesets/`: no deletion, no force-push, changes through a pull request, required status checks. _TODO: confirm they're applied in GitHub settings._
- Branch and PR workflow: [CONTRIBUTING.md](../../CONTRIBUTING.md).

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

- [ ] Remove people who have left, and drop admin rights from anyone who doesn't need them.
- [ ] Only contributors can create branches and PRs.
- [ ] Protect `dev` and `main` (confirm the rulesets above are active).
- [ ] Decide whether the repo stays public.
- [ ] Turn on GitHub secret scanning and Dependabot. (There's no `.github/dependabot.yml` yet.)

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
