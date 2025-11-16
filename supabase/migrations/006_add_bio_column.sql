-- Migration: Add bio column to users table
-- This migration adds a bio column to store user biography/description

-- Add bio column to users table if it doesn't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.users.bio IS 'User biography or description text';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

