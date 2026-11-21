---
name: security-audit
description: >-
  Use for security questions, focused security reviews, or a full security
  audit of VineMe (Supabase RLS and keys, Edge Functions, Next.js web and
  Clergy Dashboard, Expo app, secrets, auth, dependencies and CI). Run the full
  audit workflow only when someone explicitly asks for an audit, pen test or
  end-to-end security review.
---

# Security audit

Find weaknesses that let someone cross a real trust boundary in VineMe, and give the team source evidence, a safe local reproduction and the smallest fix. This is a defensive, source-first review. A suspicion with no affected person, church or resource is not a finding.

For what personal and safeguarding data needs (lawful basis, special category data, retention, age rules, vendors), use the `church-data-protection` skill. This skill covers whether the code actually enforces those rules.

## Modes

- **Guidance mode (default):** a security question, a review of one change, or checking one suspected issue. Read only the topic files you need. Don't create audit files or run every phase.
- **Full audit mode:** only when explicitly asked for an audit, pen test, or full/end-to-end security review. Follow the workflow below.

If it's unclear which is wanted, ask one question first.

## Safety rules (both modes)

- Read source; run tests only locally (`npm run db:reset`, local Supabase, unit/integration tests) with seed data and dummy users.
- Never probe production or staging Supabase projects, deployed sites, Edge Functions, ChurchSuite, push, email or SMS providers. Never use real people's data or real keys.
- Don't install new tools or dependencies to test something. Don't change source while auditing; describe the fix.
- If deciding needs a fact that isn't in the repo (dashboard settings, Vercel/EAS env vars, Supabase Auth config, storage bucket settings), mark it **needs validation** and say exactly what an owner should check.

## Where findings go

Findings never go in this repo: not in code comments, commits, branches, PR titles or bodies, public issues, Sentry, PostHog or chat logs that others can read. Write them to a private notes file outside any git checkout and tell the team lead. The repo may hold fixes and regression tests, written so they don't describe how to exploit the issue until it is fixed and deployed.

## Evidence bar

For every candidate, name:
1. **Who** (anonymous visitor, signed-in member, group leader, church admin, another church's admin, someone holding only the anon/publishable key).
2. **What they send or do.**
3. **Which control should stop them** (RLS policy, function auth check, server-side role check, Edge Function JWT check).
4. **What they get** (another church's rows, a member's contact details, a write they shouldn't make, a secret).

No crossed boundary means no finding. Missing best practice on its own is a hardening note, not a vulnerability.

Status is one of **confirmed** (traced in source and, where possible, shown locally), **needs validation** (blocked on a fact outside the repo) or **rejected** (checked and not reachable).

Severity, for confirmed findings only:
- **Critical:** anyone can read or change another church's people, safeguarding or pastoral data, take over accounts, or get a service-role/secret key.
- **High:** a signed-in user fully bypasses a role or church boundary (member acts as leader/admin, leader sees another church), or stored script runs for other users.
- **Medium:** a real boundary break with narrow reach or unusual preconditions.
- **Low:** non-secret internals disclosed, or an effect that needs a lot of effort for little gain.

Any finding that exposes personal data may be a reportable breach: say so and point to `church-data-protection`.

## Topics

Pick the files that match the change or audit scope:

| Area | Read |
| :--- | :--- |
| Tables, views, policies, database functions, storage, realtime | [references/supabase-rls.md](references/supabase-rls.md) |
| Anon/publishable vs service-role/secret keys, env vars, third-party tokens, logs | [references/keys-and-secrets.md](references/keys-and-secrets.md) |
| `supabase/functions/`, `verify_jwt`, cron, webhooks | [references/edge-functions.md](references/edge-functions.md) |
| `apps/web` route handlers, server actions, server components, dashboard | [references/nextjs-web.md](references/nextjs-web.md) |
| Sign-in, magic links, OTP, roles, impersonation, deep links | [references/auth-and-sessions.md](references/auth-and-sessions.md) |
| `apps/mobile` storage, bundle, deep links, push, OTA updates | [references/mobile-expo.md](references/mobile-expo.md) |
| npm dependencies, GitHub Actions, EAS and Vercel builds | [references/dependencies-and-ci.md](references/dependencies-and-ci.md) |
| Logic bugs that cut across areas | [references/cross-cutting.md](references/cross-cutting.md) |

## Full audit workflow

1. **Scope.** Agree scope (whole repo, one app, one area, or a diff between refs) and note the commit reviewed. A scoped audit says what it didn't cover.
2. **Map.** List the people and roles, what each may do by design, and every entry point: tables and views exposed to `anon`/`authenticated`, RPC functions, Edge Functions, Next.js route handlers and server actions, mobile services. Mark which run with elevated rights (service role, `security definer`).
3. **Hunt.** Work through the topic files for each entry point. Record each candidate with the evidence bar fields and a file:line trace.
4. **Check.** Re-trace every candidate from scratch (ideally a fresh agent that hasn't seen the original reasoning). Reproduce locally where you can with seed users from different churches and roles. Downgrade or reject anything that doesn't hold.
5. **Report.** In the private notes file: a summary table (status, severity, area), then each finding with who/what/control/result, file:line trace, local reproduction steps, and the smallest fix plus a regression test. List needs-validation items with the exact owner check. Say what wasn't covered; one pass never proves the rest is fine.

## Anti-patterns

- Reporting a checklist gap as a vulnerability.
- Treating the anon/publishable key being in the client as a finding on its own: it is public by design, RLS is the control.
- Testing against deployed environments instead of local.
- Guessing Supabase dashboard, Vercel or EAS settings that aren't in the repo.
- Calling a user doing things to their own data a boundary break.
- Writing findings anywhere in the repo or a public place.

---

Structure and evidence rules adapted from [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill) (MIT licence, Copyright (c) 2025-2026 Cloudflare, Inc.), rewritten for VineMe's stack.
