# VineMe documentation

Start here. This folder is the single home for documentation that spans the whole monorepo. Docs that only make sense next to their code (a component library README, a workstream plan) live beside that code and are linked from here.

> **Browse it as a site:** `npm run docs:dev` (search, sidebar, rendered diagrams; local only).
>
> **Agents and humans:** read [maintaining-docs.md](./maintaining-docs.md) before adding or changing anything in this folder.

## What VineMe is

VineMe helps people get connected to small groups at their church. Members use the **mobile app** to find and join groups, and to refer friends. Clergy and church admins use the **Clergy Dashboard** (web) to follow up join requests and see how people are getting connected. Both apps share one **Supabase** backend, which also syncs with **ChurchSuite**, the church management system many churches already use.

## Map of this folder

| Folder | Diátaxis type | Put here | Don't put here |
| --- | --- | --- | --- |
| [`architecture/`](./architecture/) | Explanation | How the system fits together *now*: diagrams, data flow, boundaries. | Step-by-step instructions, history. |
| [`decisions/`](./decisions/) | Explanation (ADRs) | One file per significant decision: context, choice, consequences. Append-only. | Ongoing plans or TODO lists. |
| [`features/`](./features/) | Reference | One folder per product feature: what it does, where the code is, data it touches. | Implementation diaries. |
| [`product/`](./product/) | Explanation | Roadmap (phase 1 vs phase 2), product positioning and competitor comparisons, dated and sourced. | Feature specs (use `features/`). |
| [`security/`](./security/) | Reference | Data protection, safeguarding, access and secrets: what the system does and the checks still open. | Exploitable detail (the repo is public). |
| [`guides/`](./guides/) | How-to | Task-focused instructions: set up, test, migrate, deploy, fix X. | Background explanation. |
| [`guides/runbooks/`](./guides/runbooks/) | How-to | Operational fixes for production issues. | |
| [`getting-started.md`](./getting-started.md) | Tutorial | The short route in for newcomers. | Detail (link to it instead). |
| [`glossary.md`](./glossary.md) | Reference | Domain words and their single meaning. | |
| [`business-rules.md`](./business-rules.md) | Reference | Product and privacy rules, each with where it's enforced. | Dashboard definitions (those stay in the dashboard glossary). |
| [`archive/`](./archive/) | — | Historical docs kept for context. **Not maintained; may be wrong.** | Anything new. |
| [`_templates/`](./_templates/) | — | Templates for ADRs and feature docs. | |

## Read first

1. [Getting started](./getting-started.md): what VineMe is, how to run it, who's who.
2. [Architecture overview](./architecture/README.md): the tech stack diagram and how the pieces talk.
3. [Glossary](./glossary.md): words like *church*, *service*, *group*, *join request*, *referral*.
4. [Business rules](./business-rules.md): the rules you mustn't break by accident.
5. [Decisions index](./decisions/README.md): why things are the way they are.
6. [Security, privacy and safeguarding](./security/README.md): read before touching personal data.
7. [Contributing](../CONTRIBUTING.md): branches, PRs, migrations.

## Architecture

- [System overview & tech stack](./architecture/README.md)
- [Backend: Supabase (database, RLS, RPCs, Edge Functions, cron)](./architecture/backend.md)
- [External integrations (ChurchSuite, SendGrid, Twilio, Expo Push, Sentry)](./architecture/integrations.md)
- [Mobile app](./architecture/mobile.md)
- [Web app & Clergy Dashboard](./architecture/web.md)

## Features

- [Features index](./features/README.md)
- [Group leader journey](./features/group-leader-journey/README.md) · [Groups & join requests](./features/groups-and-join-requests/README.md) · [Referrals](./features/referrals/README.md)
- [ChurchSuite integration](./features/churchsuite/README.md) · [Church website embed](./features/church-website-embed/README.md) · [Events (phase 2)](./features/events/README.md)
- Clergy Dashboard rework: [apps/web/docs/dashboard/](../apps/web/docs/dashboard/README.md) (active workstream with its own glossary and decision records)

## Product

- [Roadmap](./product/roadmap.md): phase 1 vs phase 2, and the current documentation and security work
- [VineMe vs Jovo](./product/vineme-vs-jovo.md): how VineMe compares with Jovo, the church messaging app

## Security, privacy and safeguarding

- [Overview](./security/README.md) · [Data protection (UK GDPR)](./security/data-protection.md) · [Safeguarding](./security/safeguarding.md) · [Access and secrets](./security/access-and-secrets.md)

## Guides

- [Guides index](./guides/README.md)
- [Testing](./guides/testing/README.md) · [Cross-platform testing](./guides/testing/cross-platform.md) · [Admin features testing](./guides/testing/admin-features.md)
- [Environment setup](./guides/environment-setup.md): every env var and secret, per environment
- [Database migrations](./guides/database-migrations.md)
- [Edge Functions](./guides/edge-functions.md)
- [Universal / App Links](./guides/universal-links.md) · [Email verification hosting](./guides/email-verification-hosting.md)
- [Font setup](./guides/font-setup.md)
- Runbook: [SendGrid click-tracking URLs](./guides/runbooks/sendgrid-click-tracking.md)

## Docs that live next to code

| Location | What |
| --- | --- |
| [`apps/web/docs/dashboard/`](../apps/web/docs/dashboard/README.md) | Clergy Dashboard plan, glossary, audit and decisions (`dec-*`). |
| [`apps/web/app/dashboard/DESIGN.md`](../apps/web/app/dashboard/DESIGN.md) | Dashboard design system. |
| [`apps/mobile/src/theme/`](../apps/mobile/src/theme/README.md) | Mobile theme / styling system. |
| [`apps/mobile/src/components/ui/`](../apps/mobile/src/components/ui/README.md) | Mobile UI component library. |
| [`supabase/README.md`](../supabase/README.md) | Pointer into this folder for backend docs. |
