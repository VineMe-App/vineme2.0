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
   - Mobile: copy `apps/mobile/.env.example` to `apps/mobile/.env` and fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
   - Web: create `apps/web/.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (plus `SENDGRID_API_KEY` if testing contact emails).

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

# Supabase
npm run db:migration:new <name>
npm run db:reset
npm run db:types         # Generate Supabase types into packages/shared/src/database.types.ts
```

## Vercel Deployment (`apps/web`)

- Connect the Vercel project to `VineMe-App/vineme2.0`.
- Set **Root Directory** to `apps/web`.
- Set **Ignored Build Step** to `git diff HEAD^ HEAD --quiet -- . ../../packages/shared`.
- Preserve existing environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SENDGRID_API_KEY`, etc.).

## Dashboard Issues

Clergy dashboard issues currently remain in `VineMe-App/vineme-website` so existing issue numbers stay intact. Reference them as `VineMe-App/vineme-website#<number>` in commits and PRs.
