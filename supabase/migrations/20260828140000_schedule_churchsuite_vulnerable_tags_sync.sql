-- Runs sync-churchsuite-vulnerable-tags once a day, so users tagged/untagged "Vulnerable
-- Person" directly in ChurchSuite (not just through mark-user-vulnerable) still get
-- reflected in public.users.is_vulnerable. The function is called with no church_id,
-- which tells it (as the trusted webhook caller) to walk every row in
-- churchsuite_connections itself and sync each church in turn - see
-- supabase/functions/sync-churchsuite-vulnerable-tags/index.ts.
CREATE EXTENSION IF NOT EXISTS "pg_cron";

GRANT USAGE ON SCHEMA "cron" TO "postgres";

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

-- 03:00 UTC daily - low-traffic window, well clear of any midnight-boundary jobs.
SELECT cron.schedule(
  'sync-churchsuite-vulnerable-tags-daily',
  '0 3 * * *',
  $$ SELECT public.trigger_sync_all_churchsuite_vulnerable_tags(); $$
);
