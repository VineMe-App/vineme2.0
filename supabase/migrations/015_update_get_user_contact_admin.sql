-- Update contact info RPC to read phone from auth.users (public.users has no phone column)

CREATE OR REPLACE FUNCTION get_user_contact_admin(
  target_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  result jsonb;
  user_name text;
  user_phone text;
  user_email text;
BEGIN
  -- Ensure caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  -- Ensure caller is authorised: either a church admin for the user's church,
  -- a leader/admin for a group the user belongs to (pending or active),
  -- or the user themselves.
  IF NOT (
    target_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.users target
      JOIN public.users caller ON caller.id = auth.uid()
      WHERE target.id = target_user_id
        AND caller.church_id IS NOT NULL
        AND caller.church_id = target.church_id
        AND caller.roles @> ARRAY['church_admin']::text[]
    )
    OR EXISTS (
      SELECT 1
      FROM public.group_memberships leader_membership
      WHERE leader_membership.user_id = auth.uid()
        AND leader_membership.status = 'active'
        AND leader_membership.role IN ('leader', 'admin')
        AND EXISTS (
          SELECT 1
          FROM public.group_memberships target_membership
          WHERE target_membership.group_id = leader_membership.group_id
            AND target_membership.user_id = target_user_id
            AND target_membership.status IN ('active', 'pending')
        )
    )
  ) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  -- Get name from public.users
  SELECT
    COALESCE(
      TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))),
      ''
    ) AS name
  INTO user_name
  FROM public.users
  WHERE id = target_user_id;

  IF user_name IS NULL THEN
    user_name := '';
  END IF;

  -- Attempt to get email/phone from auth.users (fallback to metadata if phone is empty)
  BEGIN
    SELECT
      email,
      COALESCE(
        NULLIF(phone, ''),
        NULLIF(raw_user_meta_data->>'phone', ''),
        NULLIF(raw_user_meta_data->>'phone_number', '')
      )
    INTO user_email, user_phone
    FROM auth.users
    WHERE id = target_user_id;
  EXCEPTION
    WHEN OTHERS THEN
      user_email := NULL;
      user_phone := NULL;
  END;

  -- Build result object
  result := jsonb_build_object(
    'name', user_name,
    'email', user_email,
    'phone', user_phone
  );

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users (function enforces role checks)
GRANT EXECUTE ON FUNCTION get_user_contact_admin(uuid) TO authenticated;
