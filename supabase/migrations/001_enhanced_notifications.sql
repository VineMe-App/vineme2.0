-- Enhanced Notifications System Migration
-- This migration enhances existing notifications table and user notification settings
-- Note: This assumes notifications and user_notification_settings tables already exist

-- Add missing columns to existing notifications table
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS action_url TEXT,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update the type constraint to include all notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'friend_request_received',
  'friend_request_accepted', 
  'group_request_submitted',
  'group_request_approved',
  'group_request_denied',
  'join_request_received',
  'join_request_approved', 
  'join_request_denied',
  'group_member_added',
  'referral_accepted',
  'referral_joined_group',
  'event_reminder',
  -- Legacy types for backward compatibility
  'friend_request',
  'group_update',
  'group_request',
  'join_request'
));

-- Set default value for data column if not already set
ALTER TABLE notifications ALTER COLUMN data SET DEFAULT '{}';

-- Add missing columns to user_notification_settings table (no id column since user_id is PK)
ALTER TABLE user_notification_settings 
ADD COLUMN IF NOT EXISTS friend_request_accepted BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS group_requests BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS group_request_responses BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS join_requests BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS join_request_responses BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS referral_updates BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read, created_at DESC) WHERE read = FALSE;

-- Create index for user notification settings
CREATE INDEX IF NOT EXISTS idx_user_notification_settings_user_id ON user_notification_settings(user_id);

-- Add updated_at trigger for notifications table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notification_settings_updated_at 
    BEFORE UPDATE ON user_notification_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for user notification settings
CREATE POLICY "Users can view own notification settings" ON user_notification_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings" ON user_notification_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings" ON user_notification_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to automatically create default notification settings for new users
CREATE OR REPLACE FUNCTION create_default_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create notification settings for new users
-- Note: This assumes the users table exists and has an id column
CREATE TRIGGER create_user_notification_settings
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_settings();

-- Add comments for documentation
COMMENT ON TABLE notifications IS 'Enhanced notifications system for storing user notifications';
COMMENT ON TABLE user_notification_settings IS 'User preferences for different types of notifications';
COMMENT ON COLUMN notifications.type IS 'Type of notification - determines the trigger and content';
COMMENT ON COLUMN notifications.data IS 'Additional data specific to the notification type (JSON)';
COMMENT ON COLUMN notifications.action_url IS 'Deep link URL for navigation when notification is tapped';
COMMENT ON COLUMN notifications.expires_at IS 'Optional expiration time for time-sensitive notifications';