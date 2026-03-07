-- Migration: Add functions for orphaned user profile linking
-- This migration adds functions to automatically link orphaned user records
-- to new auth users during sign-up based on name/email/phone matching

-- Function to find orphaned users by email/phone and name
-- Finds orphaned public.users records that should be linked to the current authenticated user's account
-- 
-- Matching strategy:
-- 1. Get current authenticated user's email/phone from auth.users (auth.uid())
-- 2. Extract first_name and last_name from auth.users metadata
-- 3. Find orphaned public.users (no auth.users) that matches by first_name and last_name
-- 4. Return the orphaned public.users id so it can be linked to the current auth.users account
--
-- Security: Only uses the current authenticated user's email/phone (from auth.uid()), ignoring
-- caller-supplied parameters. This prevents cross-account data takeover attacks.
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
  v_current_user_id UUID;
  v_auth_first_name TEXT;
  v_auth_last_name TEXT;
  v_auth_email TEXT;
  v_auth_phone TEXT;
BEGIN
  -- Get the current authenticated user's ID
  v_current_user_id := auth.uid();
  
  -- Require authentication
  IF v_current_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Step 1: Get the current authenticated user's email/phone and name from auth.users
  -- This ensures we only use the caller's own credentials, not arbitrary values they pass in
  SELECT 
    au.email,
    au.phone,
    COALESCE((au.raw_user_meta_data->>'first_name')::TEXT, p_first_name) as first_name,
    COALESCE((au.raw_user_meta_data->>'last_name')::TEXT, p_last_name) as last_name
  INTO v_auth_email, v_auth_phone, v_auth_first_name, v_auth_last_name
  FROM auth.users au
  WHERE au.id = v_current_user_id;
  
  -- Require email OR phone AND first_name AND last_name for matching
  -- If any are missing, user should sign up again (return empty)
  IF (v_auth_email IS NULL AND v_auth_phone IS NULL) THEN
    RETURN;  -- No email/phone - user must sign up
  END IF;
  
  -- Use auth metadata name if available, otherwise fall back to provided name
  v_auth_first_name := COALESCE(v_auth_first_name, p_first_name);
  v_auth_last_name := COALESCE(v_auth_last_name, p_last_name);
  
  -- Require both first_name and last_name for matching
  IF v_auth_first_name IS NULL OR NULLIF(TRIM(v_auth_first_name), '') IS NULL OR
     v_auth_last_name IS NULL OR NULLIF(TRIM(v_auth_last_name), '') IS NULL THEN
    RETURN;  -- Missing first or last name - user must sign up
  END IF;
  
  -- Step 2: Find orphaned public.users (no auth.users) that matches by first_name AND last_name
  -- We use the current authenticated user's name to find their orphaned profile
  -- The email/phone requirement is satisfied by having it in auth.users (current user)
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
      -- Match by first_name AND last_name (case-insensitive, trimmed)
      -- Both must match exactly
      LOWER(TRIM(COALESCE(pu.first_name, ''))) = LOWER(TRIM(v_auth_first_name))
      AND LOWER(TRIM(COALESCE(pu.last_name, ''))) = LOWER(TRIM(v_auth_last_name))
    )
  ORDER BY pu.created_at DESC
  LIMIT 1;
  
  -- If we found an orphaned public.users match, return it
  IF v_result.id IS NOT NULL THEN
    RETURN QUERY SELECT v_result.id, v_result.first_name, v_result.last_name;
    RETURN;
  END IF;
  
  -- No match found - user should sign up (not link to unrelated data)
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
  v_caller_id UUID;
  v_old_is_orphaned BOOLEAN := false;
BEGIN
  v_caller_id := auth.uid();

  -- Ensure the caller is linking their own new auth user
  IF v_caller_id IS NULL OR v_caller_id <> new_user_id THEN
    result := jsonb_build_object(
      'success', false,
      'message', 'Not authorized to link user data'
    );
    RETURN result;
  END IF;

  -- Ensure the old user is an orphaned public.users record (no auth.users)
  SELECT EXISTS (
    SELECT 1
    FROM public.users pu
    LEFT JOIN auth.users au ON pu.id = au.id
    WHERE pu.id = old_user_id
      AND au.id IS NULL
  )
  INTO v_old_is_orphaned;

  IF NOT v_old_is_orphaned THEN
    result := jsonb_build_object(
      'success', false,
      'message', 'Old user is not an orphaned profile'
    );
    RETURN result;
  END IF;

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
  'Finds orphaned public.users records that should be linked to the current authenticated user''s account. Matching strategy: (1) Get current user''s email/phone from auth.users (auth.uid()); (2) Extract name from auth.users metadata; (3) Require email OR phone AND first_name AND last_name; (4) Find orphaned public.users (no auth.users) matching by first_name AND last_name; (5) Return orphaned public.users id for linking. If email/phone or name is missing, returns empty (user must sign up). Security: Only uses current authenticated user''s credentials (auth.uid()), ignoring caller-supplied parameters to prevent cross-account data takeover.';

COMMENT ON FUNCTION link_orphaned_user IS 
  'Transfers all related data from an orphaned user (old_user_id) to a new auth user (new_user_id). Updates all foreign key references and deletes the old orphaned user record. Used to preserve user data when linking orphaned profiles during sign-up.';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
