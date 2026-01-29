-- Create base tables required by the application
-- This migration creates the notifications and user_notification_settings tables
-- that are referenced by later migrations

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT notifications_type_check CHECK (type IN (
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
    'friend_request',
    'group_update',
    'group_request',
    'join_request'
  ))
);

-- Create user_notification_settings table
CREATE TABLE IF NOT EXISTS user_notification_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_requests BOOLEAN DEFAULT TRUE,
  group_updates BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (will be enhanced in later migrations)
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own notification settings" ON user_notification_settings
  FOR SELECT USING (auth.uid() = user_id);
