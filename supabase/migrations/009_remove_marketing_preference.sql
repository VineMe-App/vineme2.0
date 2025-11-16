-- Migration: Remove marketing_preference column and migrate data to marketing_opt_in
-- This migration consolidates duplicate marketing preference columns

-- Step 1: Migrate any existing data from marketing_preference to marketing_opt_in
-- Only update where marketing_opt_in is NULL or false and marketing_preference is true
UPDATE public.users
SET marketing_opt_in = true
WHERE marketing_preference = true 
  AND (marketing_opt_in IS NULL OR marketing_opt_in = false);

-- Step 2: Drop the marketing_preference column
ALTER TABLE public.users
DROP COLUMN IF EXISTS marketing_preference;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

