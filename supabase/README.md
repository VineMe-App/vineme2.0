# supabase/

Migrations, seed data, local config and Edge Functions for the shared VineMe backend.

- **How it works:** [docs/architecture/backend.md](../docs/architecture/backend.md): data model, RLS, RPCs, Edge Functions, cron
- **Integrations:** [docs/architecture/integrations.md](../docs/architecture/integrations.md): ChurchSuite, SendGrid, Expo Push
- **Changing the schema:** [docs/guides/database-migrations.md](../docs/guides/database-migrations.md)
- **Adding a function:** [docs/guides/edge-functions.md](../docs/guides/edge-functions.md)

```bash
npm run db:migration:new <name>   # new migration
npm run db:reset                  # replay migrations + seed.sql locally
npm run db:types                  # regenerate packages/shared types
npm run cron:status               # list local cron jobs
```
