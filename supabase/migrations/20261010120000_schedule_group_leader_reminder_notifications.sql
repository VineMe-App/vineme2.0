-- Runs group-leader-reminder-notifications on a schedule, so group leaders get
-- reminded about pending join requests even if they never happen to open the app
-- while one is outstanding. Mirrors the pattern in
-- supabase/migrations/20260828140000_schedule_churchsuite_vulnerable_tags_sync.sql:
-- a vault secret holds the cadence (overridden locally in seed.sql, never the code),
-- and a SECURITY DEFINER function re-applies whatever cadence is currently stored.
--
-- Unlike that job, this function authenticates via withSupabase's "secret" auth mode
-- (see supabase/functions/group-leader-reminder-notifications/index.ts), which checks
-- an `apikey` header against the project's secret API key rather than a bespoke
-- webhook secret - so the trigger below sends `apikey` instead of
-- `Authorization: Bearer`. `current_setting('app.settings.sb_secret_key')` is the same
-- GUC the (dashboard-managed) push_notifications webhook already relies on for this -
-- see the commented-out trigger definition further up this migration history.
-- pg_cron/pg_net are already enabled by the churchsuite sync migration above.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'group_leader_reminder_notifications_schedule'
  ) THEN
    PERFORM vault.create_secret(
      '0 9 * * *',
      'group_leader_reminder_notifications_schedule',
      'Cron schedule for group-leader-reminder-notifications - overridden locally in seed.sql'
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION "public"."trigger_group_leader_reminder_notifications"()
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
  v_secret_key text;
  v_base_url text;
BEGIN
  -- missing_ok=true so this fails soft (skips the call) rather than erroring the whole
  -- cron job if the GUC isn't set in this environment.
  v_secret_key := current_setting('app.settings.sb_secret_key', true);

  SELECT decrypted_secret INTO v_base_url
  FROM vault.decrypted_secrets
  WHERE name = 'edge_functions_base_url';

  IF v_secret_key IS NULL OR v_base_url IS NULL THEN
    RAISE WARNING 'trigger_group_leader_reminder_notifications: missing sb_secret_key or edge_functions_base_url, skipping';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := v_base_url || '/group-leader-reminder-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_secret_key
    ),
    body := '{}'::jsonb
  );
END;
$$;

ALTER FUNCTION "public"."trigger_group_leader_reminder_notifications"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."reschedule_group_leader_reminder_notifications"()
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
  WHERE name = 'group_leader_reminder_notifications_schedule';

  PERFORM cron.schedule(
    'group-leader-reminder-notifications',
    v_schedule,
    $cron$ SELECT public.trigger_group_leader_reminder_notifications(); $cron$
  );
END;
$$;

ALTER FUNCTION "public"."reschedule_group_leader_reminder_notifications"() OWNER TO "postgres";

SELECT public.reschedule_group_leader_reminder_notifications();
