-- Runs sync-churchsuite-vulnerable-tags once a day, so users tagged/untagged "Vulnerable
-- Person" directly in ChurchSuite (not just through mark-user-vulnerable) still get
-- reflected in public.users.is_vulnerable. The function is called with no church_id,
-- which tells it (as the trusted webhook caller) to walk every row in
-- churchsuite_connections itself and sync each church in turn - see
-- supabase/functions/sync-churchsuite-vulnerable-tags/index.ts.
CREATE EXTENSION IF NOT EXISTS "pg_cron";

GRANT USAGE ON SCHEMA "cron" TO "postgres";

-- Cron cadence, stored like edge_functions_base_url (see
-- supabase/migrations/20260812221500_churchsuite_contact_sync_trigger.sql) so the same
-- reschedule call below can read an environment-specific value without the SQL itself
-- ever differing between environments. Defaults to prod's daily cadence;
-- supabase/seed.sql overrides the value (never the code) to run every minute locally.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'churchsuite_vulnerable_tags_sync_schedule'
  ) THEN
    PERFORM vault.create_secret(
      '0 3 * * *',
      'churchsuite_vulnerable_tags_sync_schedule',
      'Cron schedule for sync-churchsuite-vulnerable-tags - overridden locally in seed.sql'
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION "public"."trigger_sync_all_churchsuite_vulnerable_tags"()
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
  v_secret text;
  v_base_url text;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'edge_fn_webhook_secret';

  SELECT decrypted_secret INTO v_base_url
  FROM vault.decrypted_secrets
  WHERE name = 'edge_functions_base_url';

  PERFORM net.http_post(
    url := v_base_url || '/sync-churchsuite-vulnerable-tags',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := '{}'::jsonb
  );
END;
$$;

ALTER FUNCTION "public"."trigger_sync_all_churchsuite_vulnerable_tags"() OWNER TO "postgres";

-- (Re)applies the cron job using whatever cadence is currently stored in the
-- churchsuite_vulnerable_tags_sync_schedule secret above. Both this migration (prod
-- default) and supabase/seed.sql (local override, after updating the secret's value)
-- call this same function, rather than each calling cron.schedule() directly with a
-- different literal - the scheduling code itself never changes between environments.
CREATE OR REPLACE FUNCTION "public"."reschedule_churchsuite_vulnerable_tags_sync"()
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
  v_schedule text;
BEGIN
  SELECT decrypted_secret INTO v_schedule
  FROM vault.decrypted_secrets
  WHERE name = 'churchsuite_vulnerable_tags_sync_schedule';

  PERFORM cron.schedule(
    'sync-churchsuite-vulnerable-tags-daily',
    v_schedule,
    $cron$ SELECT public.trigger_sync_all_churchsuite_vulnerable_tags(); $cron$
  );
END;
$$;

ALTER FUNCTION "public"."reschedule_churchsuite_vulnerable_tags_sync"() OWNER TO "postgres";

SELECT public.reschedule_churchsuite_vulnerable_tags_sync();
