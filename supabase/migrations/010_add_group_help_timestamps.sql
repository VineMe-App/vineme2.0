-- Migration: Add timestamp columns for group help request lifecycle management
-- This migration enhances the cannot_find_group functionality with timestamps
-- to track when requests were made, contacted, and resolved

-- Add timestamp columns to track group help request lifecycle
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS cannot_find_group_requested_at TIMESTAMPTZ;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS cannot_find_group_contacted_at TIMESTAMPTZ;

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS cannot_find_group_resolved_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN public.users.cannot_find_group_requested_at IS 'Timestamp when user first flagged that no group fits their needs';
COMMENT ON COLUMN public.users.cannot_find_group_contacted_at IS 'Timestamp when church admin contacted the user about their group needs';
COMMENT ON COLUMN public.users.cannot_find_group_resolved_at IS 'Timestamp when user successfully found or was helped to find a suitable group';

-- Backfill existing records with requested_at timestamp
UPDATE public.users
SET cannot_find_group_requested_at = updated_at
WHERE cannot_find_group = true
  AND cannot_find_group_requested_at IS NULL;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
