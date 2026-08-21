CREATE OR REPLACE FUNCTION delete_churchsuite_connection()
RETURNS void AS $$
DECLARE
  v_church_id uuid;
  v_secret_id uuid;
BEGIN
  SELECT church_id INTO v_church_id
  FROM public.users
  WHERE id = auth.uid() AND roles @> ARRAY['church_admin'::text];

  IF v_church_id IS NULL THEN
    RAISE EXCEPTION 'Only a church admin can delete a ChurchSuite connection';
  END IF;

  SELECT churchsuite_secret_id INTO v_secret_id
  FROM churchsuite_connections
  WHERE church_id = v_church_id;

  DELETE FROM churchsuite_connections WHERE church_id = v_church_id;

  IF v_secret_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_secret_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
