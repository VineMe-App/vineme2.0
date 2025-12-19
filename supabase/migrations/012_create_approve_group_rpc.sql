-- RPC function to atomically approve a group and activate leader membership
-- This ensures that both operations succeed or both fail, preventing inconsistent states
-- where a group is approved but has no active leader

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
  v_group_status text;
  v_created_by uuid;
  v_leader_membership_id uuid;
  v_leader_membership_status text;
  v_result jsonb;
BEGIN
  -- Ensure caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  -- Verify the group exists and is pending
  SELECT status, created_by
  INTO v_group_status, v_created_by
  FROM groups
  WHERE id = p_group_id;

  IF v_group_status IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  IF v_group_status != 'pending' THEN
    RAISE EXCEPTION 'Group is not pending approval';
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
-- Note: Application layer should enforce additional permission checks
-- (e.g., church admin status)
GRANT EXECUTE ON FUNCTION approve_group_atomic(uuid, uuid) TO authenticated;

