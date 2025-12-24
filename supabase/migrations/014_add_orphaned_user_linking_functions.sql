-- Migration: Add functions for orphaned user profile linking
-- This migration adds functions to automatically link orphaned user records
-- to new auth users during sign-up based on name/email/phone matching

-- Function to find orphaned users by name/email/phone
-- Finds orphaned public.users records (without auth.users) that match the provided criteria
-- Note: Since orphaned public.users don't have email/phone stored, we primarily match by name
-- However, we also check for orphaned auth.users (no public.users) that match by email/phone
-- and can be linked by creating a public.users record
CREATE OR REPLACE FUNCTION find_orphaned_user_by_name(
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT,
  p_phone TEXT
)
RETURNS TABLE(id UUID, first_name TEXT, last_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- Scenario 1: Orphaned public.users (no auth.users) - match by name
  -- This is the primary scenario for users imported from old system
  SELECT 
    pu.id,
    pu.first_name,
    pu.last_name,
    pu.created_at
  INTO v_result
  FROM public.users pu
  LEFT JOIN auth.users au ON pu.id = au.id
  WHERE au.id IS NULL  -- Only orphaned users (no auth.users record)
    AND (
      -- Match by first_name and last_name (case-insensitive, trimmed)
      (p_first_name IS NOT NULL 
       AND LOWER(TRIM(COALESCE(pu.first_name, ''))) = LOWER(TRIM(p_first_name))
       AND p_last_name IS NOT NULL 
       AND LOWER(TRIM(COALESCE(pu.last_name, ''))) = LOWER(TRIM(p_last_name)))
      -- Or match by first_name only if last_name is not provided or missing
      OR (p_first_name IS NOT NULL 
          AND LOWER(TRIM(COALESCE(pu.first_name, ''))) = LOWER(TRIM(p_first_name))
          AND (p_last_name IS NULL OR NULLIF(TRIM(pu.last_name), '') IS NULL))
      -- Or match users with missing names if we have email/phone (for users without names)
      -- Note: This is a fallback - we can't match by email/phone directly in public.users
      -- but we can still return orphaned users if names are missing on both sides
      OR ((p_first_name IS NULL OR NULLIF(TRIM(p_first_name), '') IS NULL)
          AND (p_last_name IS NULL OR NULLIF(TRIM(p_last_name), '') IS NULL)
          AND (NULLIF(TRIM(COALESCE(pu.first_name, '')), '') IS NULL)
          AND (NULLIF(TRIM(COALESCE(pu.last_name, '')), '') IS NULL)
          AND (p_email IS NOT NULL OR p_phone IS NOT NULL))
    )
  ORDER BY 
    -- Prefer exact matches (both first and last name)
    CASE WHEN p_first_name IS NOT NULL AND p_last_name IS NOT NULL 
         AND LOWER(TRIM(COALESCE(pu.first_name, ''))) = LOWER(TRIM(p_first_name))
         AND LOWER(TRIM(COALESCE(pu.last_name, ''))) = LOWER(TRIM(p_last_name))
         THEN 1 ELSE 2 END,
    pu.created_at DESC  -- Then prefer more recent orphaned users
  LIMIT 1;
  
  -- If we found a match, return it
  IF v_result.id IS NOT NULL THEN
    RETURN QUERY SELECT v_result.id, v_result.first_name, v_result.last_name;
    RETURN;
  END IF;
  
  -- Scenario 2: Orphaned auth.users (no public.users) - match by email/phone
  -- These are auth.users that were created but never got a public.users record
  -- We can link them by using the auth.users id directly (no data transfer needed)
  SELECT 
    au.id,
    COALESCE((au.raw_user_meta_data->>'first_name')::TEXT, '') as first_name,
    COALESCE((au.raw_user_meta_data->>'last_name')::TEXT, '') as last_name,
    au.created_at
  INTO v_result
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE pu.id IS NULL  -- Auth user without public.users record
    AND (
      -- Match by email (case-insensitive)
      (p_email IS NOT NULL 
       AND au.email IS NOT NULL
       AND LOWER(TRIM(au.email)) = LOWER(TRIM(p_email)))
      -- Or match by phone (exact match, trimmed)
      OR (p_phone IS NOT NULL 
          AND au.phone IS NOT NULL
          AND TRIM(au.phone) = TRIM(p_phone))
    )
  ORDER BY au.created_at DESC
  LIMIT 1;
  
  -- If we found a match, return it
  IF v_result.id IS NOT NULL THEN
    RETURN QUERY SELECT v_result.id, v_result.first_name, v_result.last_name;
    RETURN;
  END IF;
  
  -- No match found
  RETURN;
END;
$$;

-- Function to link orphaned user data to new auth user
-- Transfers all related data (memberships, friendships, etc.) from old_user_id to new_user_id
-- Returns JSONB with success status and message
CREATE OR REPLACE FUNCTION link_orphaned_user(
  old_user_id UUID,
  new_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  updated_count INTEGER := 0;
BEGIN
  -- Update group_memberships
  UPDATE public.group_memberships
  SET user_id = new_user_id
  WHERE user_id = old_user_id;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Update friendships (both user_id and friend_id)
  UPDATE public.friendships
  SET user_id = new_user_id
  WHERE user_id = old_user_id;
  
  UPDATE public.friendships
  SET friend_id = new_user_id
  WHERE friend_id = old_user_id;
  
  -- Update referrals
  UPDATE public.referrals
  SET referred_by_user_id = new_user_id
  WHERE referred_by_user_id = old_user_id;
  
  UPDATE public.referrals
  SET referred_user_id = new_user_id
  WHERE referred_user_id = old_user_id;
  
  -- Update groups created_by
  UPDATE public.groups
  SET created_by = new_user_id
  WHERE created_by = old_user_id;
  
  -- Update notifications
  UPDATE public.notifications
  SET user_id = new_user_id
  WHERE user_id = old_user_id;
  
  -- Update user_notification_settings
  UPDATE public.user_notification_settings
  SET user_id = new_user_id
  WHERE user_id = old_user_id;
  
  -- Update user_push_tokens
  UPDATE public.user_push_tokens
  SET user_id = new_user_id
  WHERE user_id = old_user_id;
  
  -- Update group_membership_notes
  UPDATE public.group_membership_notes
  SET user_id = new_user_id
  WHERE user_id = old_user_id;
  
  UPDATE public.group_membership_notes
  SET created_by_user_id = new_user_id
  WHERE created_by_user_id = old_user_id;
  
  -- Update events host_id
  UPDATE public.events
  SET host_id = new_user_id
  WHERE host_id = old_user_id;
  
  -- Update tickets
  UPDATE public.tickets
  SET user_id = new_user_id
  WHERE user_id = old_user_id;
  
  -- Delete the old orphaned user record
  DELETE FROM public.users
  WHERE id = old_user_id;
  
  result := jsonb_build_object(
    'success', true,
    'message', 'Successfully linked orphaned user data',
    'updated_memberships', updated_count
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    result := jsonb_build_object(
      'success', false,
      'message', SQLERRM
    );
    RETURN result;
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION find_orphaned_user_by_name IS 
  'Finds orphaned user records that match the provided name/email/phone. Handles two scenarios: (1) Orphaned public.users (no auth.users) - matched by name, handles missing names; (2) Orphaned auth.users (no public.users) - matched by email/phone. Used during sign-up to automatically link existing user data to new auth accounts. Note: Orphaned public.users cannot be matched by email/phone as these fields are not stored in public.users.';

COMMENT ON FUNCTION link_orphaned_user IS 
  'Transfers all related data from an orphaned user (old_user_id) to a new auth user (new_user_id). Updates all foreign key references and deletes the old orphaned user record. Used to preserve user data when linking orphaned profiles during sign-up.';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
