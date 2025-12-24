-- Migration: Add functions for orphaned user profile linking
-- This migration adds functions to automatically link orphaned public.users records
-- (users without auth.users records) to new auth users during sign-up based on name matching

-- Function to find orphaned users by name/email/phone
-- Returns orphaned users (public.users without auth.users) that match the provided criteria
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
BEGIN
  RETURN QUERY
  SELECT 
    pu.id,
    pu.first_name,
    pu.last_name
  FROM public.users pu
  LEFT JOIN auth.users au ON pu.id = au.id
  WHERE au.id IS NULL  -- Only orphaned users (no auth.users record)
    AND (
      -- Match by first_name and last_name (case-insensitive, trimmed)
      (p_first_name IS NOT NULL 
       AND LOWER(TRIM(COALESCE(pu.first_name, ''))) = LOWER(TRIM(p_first_name))
       AND p_last_name IS NOT NULL 
       AND LOWER(TRIM(COALESCE(pu.last_name, ''))) = LOWER(TRIM(p_last_name)))
      -- Or match by first_name only if last_name is not provided
      OR (p_first_name IS NOT NULL 
          AND LOWER(TRIM(COALESCE(pu.first_name, ''))) = LOWER(TRIM(p_first_name))
          AND (p_last_name IS NULL OR pu.last_name IS NULL))
    )
  ORDER BY 
    -- Prefer exact matches (both first and last name)
    CASE WHEN p_first_name IS NOT NULL AND p_last_name IS NOT NULL 
         AND LOWER(TRIM(COALESCE(pu.first_name, ''))) = LOWER(TRIM(p_first_name))
         AND LOWER(TRIM(COALESCE(pu.last_name, ''))) = LOWER(TRIM(p_last_name))
         THEN 1 ELSE 2 END,
    pu.created_at DESC  -- Then prefer more recent orphaned users
  LIMIT 1;
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
  'Finds orphaned public.users records (without auth.users) that match the provided name. Used during sign-up to automatically link existing user data to new auth accounts.';

COMMENT ON FUNCTION link_orphaned_user IS 
  'Transfers all related data from an orphaned user (old_user_id) to a new auth user (new_user_id). Updates all foreign key references and deletes the old orphaned user record. Used to preserve user data when linking orphaned profiles during sign-up.';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

