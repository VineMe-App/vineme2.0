-- Local-only overrides, applied after migrations on `supabase db reset` / `supabase start`.
-- Never runs against prod (db push / dashboard deploys don't execute seed.sql).

-- Point DB-trigger webhook calls at the local edge functions gateway instead of
-- production. host.docker.internal lets the local Postgres container reach the host's
-- exposed Kong gateway port, where `supabase start` serves edge functions.
SELECT vault.update_secret(
  id,
  'http://host.docker.internal:54321/functions/v1'
)
FROM vault.secrets
WHERE name = 'edge_functions_base_url';

-- Local dev data snapshot (taken 2026-08-19). Restores app data so `db reset` doesn't
-- leave you starting from empty tables.
--
-- Deliberately NOT included:
--   - public.users / user_notification_settings - public.users.id has a real FK to
--     auth.users.id (users_id_fkey). auth.users lives outside the public schema and
--     wasn't dumped, and we don't have the real phone/email to recreate those accounts
--     faithfully, so seeding these rows without a matching auth.users just violates the
--     FK. After reset, sign up fresh test accounts instead (e.g. via the configured
--     test OTP numbers in config.toml).
--   - churchsuite_connections - its churchsuite_secret_id points at a Vault secret
--     holding your real ChurchSuite client identifier/secret, which lives outside the
--     public schema and won't survive a reset either way. Re-run
--     create_churchsuite_connection('y4rjpyqliqlwub52fgoo', '<secret>') once after
--     reset to recreate it.

INSERT INTO "public"."churches" ("id", "name", "location", "created_at", "address", "phone", "email", "visible") VALUES
	('32395f76-b5d0-435d-b7b1-f841116134fb', 'crown church', '{}', '2026-08-12 21:53:52.204023+00', '6 peplow close, yiewsley, ub7 7xn', '01234567890', 'test@church.com', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "public"."services" ("id", "church_id", "name", "description", "day_of_week", "start_time", "location", "created_at") VALUES
	('9a6b630b-f985-4e06-b8dd-3d2c559d7f31', '32395f76-b5d0-435d-b7b1-f841116134fb', 'morning', NULL, 'Sunday', '10:00', '{}', '2026-08-12 21:54:37.127736+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "public"."feature_flag" ("id", "name", "description", "value", "strategy", "percentage", "public", "created_at") VALUES
	('5acae23b-dba8-4520-a7a6-a93b5a3677ac', 'churchsuite', NULL, true, 'global', 100, false, '2026-08-12 22:01:07.755586+00')
ON CONFLICT (id) DO NOTHING;
