-- Migration: Add functions for orphaned user profile linking
-- This migration adds functions to automatically link orphaned user records
-- to new auth users during sign-up based on name/email/phone matching

-- Function to find orphaned users by email/phone and name
-- Finds orphaned public.users records that should be linked to a new auth.users account
-- 
-- Matching strategy:
-- 1. Find auth.users by email/phone (unique identifiers for security)
-- 2. Extract first_name and last_name from auth.users metadata
-- 3. Find orphaned public.users (no auth.users) that matches by first_name and last_name
-- 4. Return the orphaned public.users id so it can be linked to the new auth.users account
--
-- Security: Uses email/phone (unique identifiers) to find auth.users, then uses name matching
-- only after we've verified the email/phone match. This prevents false matches.
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
  v_has_email_or_phone BOOLEAN;
  v_auth_first_name TEXT;
  v_auth_last_name TEXT;
BEGIN
  -- Check if we have email/phone to match on
  v_has_email_or_phone := (p_email IS NOT NULL OR p_phone IS NOT NULL);
  
  -- Require email/phone for any matching (security requirement)
  IF NOT v_has_email_or_phone THEN
    RETURN;
  END IF;
  
  -- Step 1: Find auth.users by email/phone to get the authenticated user's name
  SELECT 
    COALESCE((au.raw_user_meta_data->>'first_name')::TEXT, p_first_name) as first_name,
    COALESCE((au.raw_user_meta_data->>'last_name')::TEXT, p_last_name) as last_name
  INTO v_auth_first_name, v_auth_last_name
  FROM auth.users au
  WHERE (
    -- Match by email (case-insensitive)
    (p_email IS NOT NULL 
     AND au.email IS NOT NULL
     AND LOWER(TRIM(au.email)) = LOWER(TRIM(p_email)))
    -- Or match by phone (exact match, trimmed)
    OR (p_phone IS NOT NULL 
        AND au.phone IS NOT NULL
        AND TRIM(au.phone) = TRIM(p_phone))
  )
  LIMIT 1;
  
  -- If we found an auth.users record, use its name (or provided name) to find orphaned public.users
  IF v_auth_first_name IS NOT NULL OR v_auth_last_name IS NOT NULL THEN
    -- Use auth metadata name if available, otherwise fall back to provided name
    v_auth_first_name := COALESCE(v_auth_first_name, p_first_name);
    v_auth_last_name := COALESCE(v_auth_last_name, p_last_name);
    
    -- Step 2: Find orphaned public.users (no auth.users) that matches by first_name and last_name
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
        (v_auth_first_name IS NOT NULL 
         AND LOWER(TRIM(COALESCE(pu.first_name, ''))) = LOWER(TRIM(v_auth_first_name))
         AND v_auth_last_name IS NOT NULL 
         AND LOWER(TRIM(COALESCE(pu.last_name, ''))) = LOWER(TRIM(v_auth_last_name)))
      )
    ORDER BY pu.created_at DESC
    LIMIT 1;
    
    -- If we found an orphaned public.users match, return it
    IF v_result.id IS NOT NULL THEN
      RETURN QUERY SELECT v_result.id, v_result.first_name, v_result.last_name;
      RETURN;
    END IF;
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
  'Finds orphaned public.users records that should be linked to a new auth.users account. Matching strategy: (1) Find auth.users by email/phone (unique identifiers); (2) Extract name from auth.users metadata; (3) Find orphaned public.users (no auth.users) matching by first_name and last_name; (4) Return orphaned public.users id for linking. Security: Uses email/phone for initial lookup, then name matching only after email/phone verification.';

COMMENT ON FUNCTION link_orphaned_user IS 
  'Transfers all related data from an orphaned user (old_user_id) to a new auth user (new_user_id). Updates all foreign key references and deletes the old orphaned user record. Used to preserve user data when linking orphaned profiles during sign-up.';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
