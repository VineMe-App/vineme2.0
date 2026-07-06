-- Migration: Add marketing_opt_in column to users table
-- This migration adds a marketing_opt_in column to store user marketing preferences

-- Add marketing_opt_in column to users table if it doesn't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.users.marketing_opt_in IS 'User opt-in preference for marketing emails and newsletters';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

