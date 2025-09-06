-- Fix and harden notifications RLS policies
-- This migration is idempotent: it only creates policies if missing.

-- Ensure RLS is enabled (safe if already enabled)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;

-- Create select/update/delete policies for notifications (own rows only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND polname = 'select_own_notifications'
  ) THEN
    CREATE POLICY select_own_notifications ON notifications
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND polname = 'update_own_notifications'
  ) THEN
    CREATE POLICY update_own_notifications ON notifications
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND polname = 'delete_own_notifications'
  ) THEN
    CREATE POLICY delete_own_notifications ON notifications
      FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END$$;

-- IMPORTANT: Allow inserts of notifications from the app (client) for any user.
-- This mirrors system-triggered notifications until you move creation to a server role.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND polname = 'insert_notifications_any_authenticated'
  ) THEN
    CREATE POLICY insert_notifications_any_authenticated ON notifications
      FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;
END$$;

-- user_notification_settings policies (own row only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_notification_settings' AND polname = 'select_own_notification_settings'
  ) THEN
    CREATE POLICY select_own_notification_settings ON user_notification_settings
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_notification_settings' AND polname = 'update_own_notification_settings'
  ) THEN
    CREATE POLICY update_own_notification_settings ON user_notification_settings
      FOR UPDATE TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_notification_settings' AND polname = 'insert_own_notification_settings'
  ) THEN
    CREATE POLICY insert_own_notification_settings ON user_notification_settings
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- Note: For production, prefer inserting notifications via a SECURITY DEFINER function
-- executed with the service role or a trusted database role, and restrict this broad
-- insert policy. This migration unblocks client-side inserts used by the app today.

