-- Migration: Add is_vulnerable column to users table
-- This migration adds an is_vulnerable column to flag vulnerable users

-- Add is_vulnerable column to users table if it doesn't exist
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_vulnerable BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.users.is_vulnerable IS 'Flag indicating that the user is considered vulnerable';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
