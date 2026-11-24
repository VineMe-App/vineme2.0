# ADR-0002: Monorepo with npm workspaces

- **Status:** Accepted (backfilled)
- **Date:** 2026-11-21
- **Scope:** cross-cutting

## Context

_Backfilled: this context is reconstructed from the code and commit history. Add the original reasoning if you know it._

The mobile app, the website / Clergy Dashboard and the Supabase backend share one database schema and its generated types. Separate repos made schema changes hard to keep in step (dashboard issues were tracked in `VineMe-App/vineme-website` until they were moved into this repo in November 2026).

## Decision

One repository with npm workspaces: `apps/mobile` (`@vineme/mobile`), `apps/web` (`@vineme/web`), `packages/shared` (`@vineme/shared`), with `supabase/` at the root. Generated database types go to `packages/shared` (`npm run db:types`). CI (`.github/workflows/test.yml`) uses `npm ci`.

## Consequences

- **Good:** a schema change, its types and both apps' usage can land in one PR. One CI pipeline.
- **Trade-off:** Vercel needs an ignored-build-step filter so mobile-only changes don't rebuild the web app.
- **Note:** changing the package manager (e.g. to pnpm) is a new ADR that supersedes this one.
