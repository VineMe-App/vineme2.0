# VineMe Mobile (`@vineme/mobile`)

Expo 54 / React Native 0.81 / Expo Router mobile app.

## Structure & Conventions

- **Path alias:** `@/*` maps to `apps/mobile/src/*`.
- **Source layout:** `src/app/` (Expo Router routes), `src/components/`, `src/hooks/`, `src/services/`, `src/stores/`, `src/providers/`, `src/theme/`, `src/utils/`, `src/__tests__/`.
- **Styling:** Use the token-based theme system in `src/theme/` and themed primitives in `src/components/ui/` instead of hardcoded colours or spacing.
- **Data & state:**
  - Put Supabase queries and mutations in `src/services/`.
  - Wrap server state in TanStack Query hooks under `src/hooks/`.
  - Keep client-only UI state in Zustand stores under `src/stores/`.
  - Share database interfaces via `@vineme/shared` (`packages/shared/src/database.ts`).

## Verification

Note that root `npm run typecheck` checks `packages/shared` and `apps/web` only—run `typecheck:mobile` explicitly for mobile changes:

```bash
npm run lint:mobile
npm run typecheck:mobile
npm run test:unit
```

When changing auth, referral, or service flows, also run `npm run test:integration` and `npm run test:e2e`.
