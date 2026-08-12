-- Shared secret used by DB triggers to authenticate calls to edge functions.
-- Verified by the receiving function against the CHURCHSUITE_WEBHOOK_SECRET env var.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'edge_fn_webhook_secret'
  ) THEN
    PERFORM vault.create_secret(
      encode(gen_random_bytes(32), 'hex'),
      'edge_fn_webhook_secret',
      'Shared secret used by DB triggers to authenticate calls to edge functions'
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION "public"."trigger_sync_churchsuite_contact"()
RETURNS "trigger"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'edge_fn_webhook_secret';

  PERFORM net.http_post(
    url := 'https://knwlfuysipixbwuzvyen.supabase.co/functions/v1/create-churchsuite-contact',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := jsonb_build_object('id', NEW.id, 'church_id', NEW.church_id)
  );

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."trigger_sync_churchsuite_contact"() OWNER TO "postgres";

-- Normal self-onboarding: the whole profile (name, church_id, service_id,
-- onboarding_complete) is written in a single upsert at the end of onboarding, so that
-- INSERT is "signup completion" for this path.
CREATE OR REPLACE TRIGGER "sync_churchsuite_contact_on_insert"
AFTER INSERT ON "public"."users"
FOR EACH ROW
WHEN (("new"."church_id" IS NOT NULL) AND ("new"."churchsuite_id" IS NULL))
EXECUTE FUNCTION "public"."trigger_sync_churchsuite_contact"();

-- Referred users: create-referred-user inserts their row with church_id NULL. They only
-- get a church_id once they later complete onboarding themselves, via an UPDATE - catch
-- that transition (and only that transition) here.
CREATE OR REPLACE TRIGGER "sync_churchsuite_contact_on_church_set"
AFTER UPDATE OF "church_id" ON "public"."users"
FOR EACH ROW
WHEN (("old"."church_id" IS NULL) AND ("new"."church_id" IS NOT NULL) AND ("new"."churchsuite_id" IS NULL))
EXECUTE FUNCTION "public"."trigger_sync_churchsuite_contact"();
