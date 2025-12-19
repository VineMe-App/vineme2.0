-- RPC function to get user contact information for admin/group leader access
-- Returns name, email, and phone for a target user
-- Enforces authentication and role/membership checks server-side
--
-- Note: Email is stored in auth.users, which may not be directly accessible from
-- a PostgreSQL function. This function returns name and phone from public.users.
-- Email should be fetched separately using Supabase client auth methods if needed.
-- However, we attempt to access auth.users - if it fails, email will be NULL.

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

  -- Get name and phone from public.users
  SELECT 
    COALESCE(
      TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))),
      ''
    ) AS name,
    phone
  INTO user_name, user_phone
  FROM public.users
  WHERE id = target_user_id;

  -- If user not found in public.users, return empty result
  IF user_name IS NULL AND user_phone IS NULL THEN
    RETURN jsonb_build_object(
      'name', '',
      'email', NULL,
      'phone', NULL
    );
  END IF;

  -- Attempt to get email from auth.users
  -- Note: This may not work in all Supabase configurations
  -- If it fails, email will be NULL and can be fetched via client-side auth methods
  BEGIN
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = target_user_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- If we can't access auth.users, set email to NULL
      -- Application layer can fetch it separately if needed
      user_email := NULL;
  END;

  -- Build result object
  result := jsonb_build_object(
    'name', COALESCE(user_name, ''),
    'email', user_email,
    'phone', user_phone
  );

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users (function enforces role checks)
GRANT EXECUTE ON FUNCTION get_user_contact_admin(uuid) TO authenticated;
