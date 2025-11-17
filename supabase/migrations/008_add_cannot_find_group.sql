-- Migration: Add cannot_find_group column to users table
-- This migration adds a cannot_find_group column to flag users who cannot find suitable groups

-- Add cannot_find_group column to users table if it doesn't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS cannot_find_group BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.users.cannot_find_group IS 'Flag indicating that the user cannot find a suitable group and needs help from the connections team';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

