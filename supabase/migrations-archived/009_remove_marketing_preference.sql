-- Migration: Remove marketing_preference column and migrate data to marketing_opt_in
-- This migration consolidates duplicate marketing preference columns

-- Step 1: Check if marketing_preference column exists and migrate data if it does
-- Only update where marketing_opt_in is NULL or false and marketing_preference is true
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'marketing_preference'
  ) THEN
    -- Use dynamic SQL so the statement only gets parsed when the column exists
    EXECUTE $$
      UPDATE public.users
      SET marketing_opt_in = true
      WHERE marketing_preference = true
        AND (marketing_opt_in IS NULL OR marketing_opt_in = false)
    $$;
  END IF;
END $$;

-- Step 2: Drop the marketing_preference column if it exists
ALTER TABLE public.users
DROP COLUMN IF EXISTS marketing_preference;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

