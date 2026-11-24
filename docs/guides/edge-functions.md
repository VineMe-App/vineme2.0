# Edge Functions

> **Summary.** Edge Functions are Deno handlers in `supabase/functions/<name>/index.ts`, configured in `supabase/config.toml`. Use one whenever code needs the service role key or a third-party secret. The catalogue of existing functions is in [architecture/backend.md](../architecture/backend.md#edge-functions).

## Adding a function

1. Create `supabase/functions/<name>/index.ts` and `deno.json` (copy an existing function such as `mark-user-vulnerable`).
2. Start the file with a **header comment** that says what it does, who calls it (app, trigger or cron), how it authenticates, and which secrets it reads. That comment is the detailed reference.
3. Add a `[functions.<name>]` block to `supabase/config.toml` and set `verify_jwt` on purpose. If it's `false`, add a comment explaining how the function authenticates instead (e.g. a webhook secret).
4. Put shared helpers in `supabase/functions/_shared/`.
5. Derive `church_id` from the caller's profile. Never trust it from the request body.
6. Update the Edge Functions table in `architecture/backend.md` (and `integrations.md` if it calls an external service).

## Running locally

Secrets each function needs, and how to get local values: [environment-setup.md](./environment-setup.md#edge-functions).

```bash
supabase start
supabase functions serve <name>   # loads supabase/functions/.env by default (copy it from .env.example)
docker compose up churchsuite mocks                                  # ChurchSuite mock on :8030
```

## Deploying

_TODO: confirm. Document whether functions are deployed by CI or by hand with `supabase functions deploy <name>`, and which project refs (staging/prod) they go to._

Note: `push-notify` is deployed under the name `push-notify-2` (see `config.toml`).
