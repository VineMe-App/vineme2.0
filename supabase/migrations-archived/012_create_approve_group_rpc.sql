-- RPC function to atomically approve a group and activate leader membership
-- This ensures that both operations succeed or both fail, preventing inconsistent states
-- where a group is approved but has no active leader
-- 
-- Security: This function enforces that only church admins (or superadmins) can approve groups,
-- and only for groups in their own church (or any church for superadmins).

CREATE OR REPLACE FUNCTION approve_group_atomic(
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
  v_leader_membership_status text;
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

  -- Check for existing leader membership
  IF v_created_by IS NOT NULL THEN
    SELECT id, status
    INTO v_leader_membership_id, v_leader_membership_status
    FROM group_memberships
    WHERE group_id = p_group_id
      AND user_id = v_created_by
      AND role = 'leader'
    LIMIT 1;

    -- Create or activate leader membership
    IF v_leader_membership_id IS NULL THEN
      -- Create new leader membership
      INSERT INTO group_memberships (
        group_id,
        user_id,
        role,
        status,
        joined_at
      ) VALUES (
        p_group_id,
        v_created_by,
        'leader',
        'active',
        NOW()
      ) RETURNING id INTO v_leader_membership_id;
    ELSIF v_leader_membership_status != 'active' THEN
      -- Activate existing membership
      UPDATE group_memberships
      SET status = 'active',
          joined_at = COALESCE(joined_at, NOW())
      WHERE id = v_leader_membership_id;
    END IF;
  END IF;

  -- Update group status to approved (only after membership is ensured)
  UPDATE groups
  SET status = 'approved',
      updated_at = NOW()
  WHERE id = p_group_id;

  -- Return success result
  v_result := jsonb_build_object(
    'success', true,
    'group_id', p_group_id,
    'leader_membership_id', v_leader_membership_id
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback is automatic in PostgreSQL transactions
    -- Return error details
    RAISE EXCEPTION 'Failed to approve group: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
-- Note: Permission checks are enforced within the function itself:
-- - Caller must be authenticated (auth.uid() is not null)
-- - Caller ID must match the provided admin ID (prevents impersonation)
-- - Caller must have 'church_admin' or 'superadmin' role
-- - Caller's church_id must match the group's church_id (or caller is superadmin)
GRANT EXECUTE ON FUNCTION approve_group_atomic(uuid, uuid) TO authenticated;

