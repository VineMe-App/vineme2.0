-- Migration: Simple delete account (no edge functions needed)
-- This migration sets up a simple account deletion system

-- Create a simple delete_my_account function that deletes all database records
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_sole_leader_groups text[];
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check for sole leadership
  SELECT array_agg(g.title)
  INTO v_sole_leader_groups
  FROM public.groups g
  WHERE g.id IN (
    SELECT gm1.group_id
    FROM public.group_memberships gm1
    WHERE gm1.user_id = v_user_id
      AND gm1.role = 'leader'
      AND gm1.status = 'active'
      AND g.status = 'approved'
    AND NOT EXISTS (
      SELECT 1
      FROM public.group_memberships gm2
      WHERE gm2.group_id = gm1.group_id
        AND gm2.user_id != v_user_id
        AND gm2.role IN ('leader', 'admin')
        AND gm2.status = 'active'
    )
  );

  IF array_length(v_sole_leader_groups, 1) > 0 THEN
    RAISE EXCEPTION 'SOLE_LEADER: You are the sole leader of the following group(s): %. Please assign a new leader or close the group before deleting your account.', 
      array_to_string(v_sole_leader_groups, ', ');
  END IF;

  -- Delete user data from existing tables with correct column names
  DELETE FROM public.group_memberships WHERE user_id = v_user_id;
  DELETE FROM public.friendships WHERE user_id = v_user_id OR friend_id = v_user_id;
  DELETE FROM public.referrals WHERE referred_by_user_id = v_user_id OR referred_user_id = v_user_id;
  DELETE FROM public.notifications WHERE user_id = v_user_id;
  DELETE FROM public.user_notification_settings WHERE user_id = v_user_id;
  DELETE FROM public.user_push_tokens WHERE user_id = v_user_id;
  
  -- Finally, delete the user record
  DELETE FROM public.users WHERE id = v_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Account deleted successfully',
    'deleted_user_id', v_user_id
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO postgres;
REVOKE EXECUTE ON FUNCTION public.delete_my_account() FROM anon;

-- Add comment for documentation
COMMENT ON FUNCTION public.delete_my_account() IS 
'Allows an authenticated user to delete their own account and all associated data. 
Prevents deletion if the user is the sole leader of any active groups.';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
