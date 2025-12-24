-- Migration: Add functions for orphaned user profile linking
-- This migration adds functions to automatically link orphaned user records
-- to new auth users during sign-up based on name/email/phone matching

-- Function to find orphaned users by email/phone
-- Finds orphaned auth.users records (without public.users) that match the provided email/phone
-- 
-- Matching strategy:
-- 1. Match orphaned auth.users by email (case-insensitive) OR phone (exact match)
-- 2. If no email/phone provided: Return empty (user should sign up, not link to unrelated data)
--
-- Security: Only matches by email/phone (unique identifiers), never by name to prevent false matches
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
BEGIN
  -- Check if we have email/phone to match on
  v_has_email_or_phone := (p_email IS NOT NULL OR p_phone IS NOT NULL);
  
  -- Require email/phone for any matching (security requirement)
  IF NOT v_has_email_or_phone THEN
    RETURN;
  END IF;
  
  -- Match orphaned auth.users by email/phone
  -- These are auth.users that were created but never got a public.users record
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
  'Finds orphaned auth.users records (without public.users) that match the provided email/phone. Matching strategy: (1) Match by email (case-insensitive) OR phone (exact match); (2) No email/phone: Return empty (user signs up). Security: Only matches by email/phone (unique identifiers), never by name to prevent false matches.';

COMMENT ON FUNCTION link_orphaned_user IS 
  'Transfers all related data from an orphaned user (old_user_id) to a new auth user (new_user_id). Updates all foreign key references and deletes the old orphaned user record. Used to preserve user data when linking orphaned profiles during sign-up.';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
