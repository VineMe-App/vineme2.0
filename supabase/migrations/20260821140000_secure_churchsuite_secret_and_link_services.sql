-- get_churchsuite_secret returns a church's decrypted ChurchSuite client
-- secret for whatever p_church_id it's given, with no ownership check of
-- its own. It must only ever be called by trusted server code (service_role
-- via an edge function), never directly by app users.
REVOKE EXECUTE ON FUNCTION "public"."get_churchsuite_secret"("p_church_id" "uuid")
  FROM "anon", "authenticated";

CREATE OR REPLACE FUNCTION link_service_to_churchsuite_site(
  p_service_id uuid,
  p_churchsuite_site_id text
)
RETURNS void AS $$
DECLARE
  v_church_id uuid;
BEGIN
  SELECT church_id INTO v_church_id
  FROM public.users
  WHERE id = auth.uid() AND roles @> ARRAY['church_admin'::text];

  IF v_church_id IS NULL THEN
    RAISE EXCEPTION 'Only a church admin can link a service to a ChurchSuite site';
  END IF;

  UPDATE public.services
  SET churchsuite_site_id = p_churchsuite_site_id
  WHERE id = p_service_id AND church_id = v_church_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service not found for this church';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Even though the function checks caller identity itself, only grant
-- EXECUTE to authenticated users - anon has no legitimate reason to call
-- it, and the default privileges for this project grant EXECUTE on new
-- functions to anon and authenticated alike.
REVOKE EXECUTE ON FUNCTION link_service_to_churchsuite_site(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION link_service_to_churchsuite_site(uuid, text)
  TO authenticated;
