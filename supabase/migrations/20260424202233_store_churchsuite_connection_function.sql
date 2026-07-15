CREATE OR REPLACE FUNCTION create_churchsuite_connection(
  p_identifier text,
  p_secret text
)
RETURNS uuid AS $$
DECLARE
  v_church_id uuid;
  v_secret_id uuid;
  v_connection_id uuid;
BEGIN
  SELECT church_id INTO v_church_id
  FROM public.users
  WHERE id = auth.uid() AND roles @> ARRAY['church_admin'::text];

  IF v_church_id IS NULL THEN
    RAISE EXCEPTION 'Only a church admin can create a ChurchSuite connection';
  END IF;

  SELECT vault.create_secret(p_secret, 'churchsuite_' || v_church_id)
  INTO v_secret_id;

  INSERT INTO churchsuite_connections (church_id, churchsuite_identifier, churchsuite_secret_id)
  VALUES (v_church_id, p_identifier, v_secret_id)
  RETURNING id INTO v_connection_id;

  RETURN v_connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
