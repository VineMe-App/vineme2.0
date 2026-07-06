-- Secure RPCs for creating notifications that bypass RLS via SECURITY DEFINER
-- and enforce that the caller is authenticated (auth.uid() is not null).

-- Single notification create RPC
CREATE OR REPLACE FUNCTION app_create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_data jsonb DEFAULT '{}'::jsonb,
  p_action_url text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_row notifications;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  INSERT INTO notifications (
    user_id, type, title, body, data, action_url, expires_at, read, created_at, updated_at
  ) VALUES (
    p_user_id, p_type, p_title, p_body, COALESCE(p_data, '{}'::jsonb), p_action_url, p_expires_at, FALSE, NOW(), NOW()
  ) RETURNING * INTO new_row;

  RETURN new_row;
END;
$$;

GRANT EXECUTE ON FUNCTION app_create_notification(uuid, text, text, text, jsonb, text, timestamptz) TO authenticated;

