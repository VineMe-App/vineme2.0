CREATE OR REPLACE FUNCTION get_churchsuite_secret(p_church_id uuid)
RETURNS TABLE(identifier text, secret text) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.churchsuite_identifier,
    v.decrypted_secret
  FROM churchsuite_connections c
  JOIN vault.decrypted_secrets v ON v.id = c.churchsuite_secret_id
  WHERE c.church_id = p_church_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
