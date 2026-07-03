-- RPC function to atomically decline a group and deactivate leader membership
-- This ensures that both operations succeed or both fail, preventing inconsistent states
-- where a group is declined but the leader's membership remains active
-- 
-- Security: This function enforces that only church admins (or superadmins) can decline groups,
-- and only for groups in their own church (or any church for superadmins).

CREATE OR REPLACE FUNCTION decline_group_atomic(
  p_group_id uuid,
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_caller_roles text[];
  v_caller_church_id uuid;
  v_group_status text;
  v_group_church_id uuid;
  v_created_by uuid;
  v_leader_membership_id uuid;
  v_result jsonb;
BEGIN
  -- Ensure caller is authenticated
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  -- Verify the caller ID matches the admin ID (prevent impersonation)
  IF v_caller_id != p_admin_id THEN
    RAISE EXCEPTION 'Caller ID does not match admin ID' USING ERRCODE = '42501';
  END IF;

  -- Get caller's roles and church_id to verify permissions
  SELECT roles, church_id
  INTO v_caller_roles, v_caller_church_id
  FROM users
  WHERE id = v_caller_id;

  IF v_caller_roles IS NULL THEN
    RAISE EXCEPTION 'User not found' USING ERRCODE = 'P0001';
  END IF;

  -- Check if caller has church_admin or superadmin role
  IF NOT (
    'church_admin' = ANY(v_caller_roles) OR
    'superadmin' = ANY(v_caller_roles)
  ) THEN
    RAISE EXCEPTION 'Church admin role required for this action' USING ERRCODE = '42501';
  END IF;

  -- Verify the group exists and is pending
  SELECT status, created_by, church_id
  INTO v_group_status, v_created_by, v_group_church_id
  FROM groups
  WHERE id = p_group_id;

  IF v_group_status IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  IF v_group_status != 'pending' THEN
    RAISE EXCEPTION 'Group is not pending approval';
  END IF;

  -- Verify caller can access this church's data
  -- Superadmins can access any church, church admins can only access their own church
  IF NOT (
    'superadmin' = ANY(v_caller_roles) OR
    (v_caller_church_id IS NOT NULL AND v_caller_church_id = v_group_church_id)
  ) THEN
    RAISE EXCEPTION 'Access denied to church data' USING ERRCODE = '42501';
  END IF;

  -- Deactivate or remove the creator's leader membership
  IF v_created_by IS NOT NULL THEN
    -- Find the leader membership
    SELECT id
    INTO v_leader_membership_id
    FROM group_memberships
    WHERE group_id = p_group_id
      AND user_id = v_created_by
      AND role = 'leader'
    LIMIT 1;

    -- If membership exists, delete it (cleaner than deactivating)
    -- This removes the stale membership entirely
    IF v_leader_membership_id IS NOT NULL THEN
      DELETE FROM group_memberships
      WHERE id = v_leader_membership_id;
    END IF;
  END IF;

  -- Update group status to declined (only after membership is cleaned up)
  UPDATE groups
  SET status = 'declined',
      updated_at = NOW()
  WHERE id = p_group_id;

  -- Return success result
  v_result := jsonb_build_object(
    'success', true,
    'group_id', p_group_id,
    'membership_removed', v_leader_membership_id IS NOT NULL
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback is automatic in PostgreSQL transactions
    -- Return error details
    RAISE EXCEPTION 'Failed to decline group: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
-- Note: Permission checks are enforced within the function itself:
-- - Caller must be authenticated (auth.uid() is not null)
-- - Caller ID must match the provided admin ID (prevents impersonation)
-- - Caller must have 'church_admin' or 'superadmin' role
-- - Caller's church_id must match the group's church_id (or caller is superadmin)
GRANT EXECUTE ON FUNCTION decline_group_atomic(uuid, uuid) TO authenticated;

