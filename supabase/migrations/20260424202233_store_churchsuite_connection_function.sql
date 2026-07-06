CREATE OR REPLACE FUNCTION create_churchsuite_connection(
  p_church_id uuid,
  p_identifier text,
  p_secret text
)
RETURNS uuid AS $$
DECLARE
  v_secret_id uuid;
  v_connection_id uuid;
BEGIN
  SELECT vault.create_secret(p_secret, 'churchsuite_' || p_church_id)
  INTO v_secret_id;

  INSERT INTO churchsuite_connections (church_id, churchsuite_identifier, churchsuite_secret_id)
  VALUES (p_church_id, p_identifier, v_secret_id)
  RETURNING id INTO v_connection_id;

  RETURN v_connection_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
