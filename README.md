# VineMe Monorepo

Monorepo for VineMe: the Expo mobile app, the Next.js website & clergy admin dashboard, shared types, and the shared Supabase backend.

## Repository Structure

```text
vineme2.0/
├── apps/
│   ├── mobile/          # Expo / React Native app (@vineme/mobile)
│   └── web/             # Next.js website & clergy dashboard (@vineme/web)
├── packages/
│   └── shared/          # Shared database types & constants (@vineme/shared)
├── supabase/            # Migrations, seed.sql, config.toml, Edge Functions
├── mocks/               # Local mock services & ChurchSuite OpenAPI spec
├── scripts/             # Repo and Supabase helper scripts
└── docs/                # Mobile & general documentation
```

## Getting Started

1. **Install dependencies** from the repository root:
   ```bash
   npm install
   ```

2. **Environment variables**:
   - Mobile: copy `apps/mobile/.env.example` to `apps/mobile/.env`.
   - Web: copy `apps/web/.env.example` to `apps/web/.env.local`.
   - Edge Functions (only if you work on them): copy `supabase/functions/.env.example` to `supabase/functions/.env`.
   - Fill in the Supabase URL and anon key from `supabase status`. Every variable, and where to get each value, is in [docs/guides/environment-setup.md](./docs/guides/environment-setup.md).

## Common Commands

```bash
# Development
npm run dev:mobile       # Start Expo dev server
npm run dev:web          # Start Next.js dev server

# Quality & Tests
npm run lint             # Lint mobile and web
npm run typecheck        # TypeScript check across mobile and web
npm run test:unit        # Run mobile unit tests
npm run build:web        # Build Next.js web app

# Docs
npm run docs:dev         # Browse docs/ as a local site (search + diagrams)
npm run docs:build       # Build the site; fails on broken doc links

# Supabase
npm run db:migration:new <name>
npm run db:reset
npm run db:types         # Generate Supabase types into packages/shared/src/database.types.ts
```

## Vercel Deployment (`apps/web`)

- Connect the Vercel project to `VineMe-App/vineme2.0`.
- Set **Root Directory** to `apps/web`.
- Set **Ignored Build Step** to `git diff HEAD^ HEAD --quiet -- . ../../packages/shared`.
- Preserve existing environment variables. The full list is in [docs/guides/environment-setup.md](./docs/guides/environment-setup.md#web-app).

## Dashboard Issues

Clergy dashboard issues now live in this repo alongside everything else (moved from `VineMe-App/vineme-website`, so they have new numbers; old links redirect). Reference them as `#<number>` in commits and PRs.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for branch naming, PR workflow, database migration steps, and branch cleanup guidelines.
