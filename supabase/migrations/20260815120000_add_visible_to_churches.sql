-- The `visible` column already exists on production (added outside of migration
-- tracking), but was missing from migration history, so local/rebuilt databases never
-- got it - ChurchStep.tsx filters on `visible = true`, so without this column the
-- church picker silently returns nothing.
ALTER TABLE "public"."churches" ADD COLUMN IF NOT EXISTS "visible" boolean;
