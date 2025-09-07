# Supabase Database Migrations

This directory contains database migrations for the VineMe application.

## Migration Files

### 001_enhanced_notifications.sql
Creates the enhanced notifications system with the following components:

#### Tables Created:
1. **notifications** - Stores all user notifications
   - Supports multiple notification types (friend requests, group requests, etc.)
   - Includes metadata like read status, expiration, and action URLs
   - JSONB data field for type-specific information

2. **user_notification_settings** - User preferences for notifications
   - Individual toggles for each notification type
   - Push and email notification preferences
   - Automatically created for new users

#### Indexes Created:
- `idx_notifications_user_id` - Fast user notification queries
- `idx_notifications_read` - Efficient unread notification filtering
- `idx_notifications_created_at` - Chronological ordering
- `idx_notifications_type` - Filtering by notification type
- `idx_notifications_expires_at` - Cleanup of expired notifications
- `idx_notifications_user_unread` - Optimized unread count queries

#### Security Features:
- Row Level Security (RLS) enabled on both tables
- Users can only access their own notifications and settings
- System can insert notifications for any user
- Automatic triggers for updated_at timestamps

#### Automatic Features:
- Default notification settings created for new users
- Updated timestamps maintained automatically
- Proper foreign key constraints and cascading deletes

## Running Migrations

### Using Supabase CLI:
```bash
# Apply migration to local development
supabase db reset

# Apply to remote project
supabase db push
```

### Manual Application:
If you need to apply the migration manually, run the SQL file contents in your Supabase SQL editor or psql client.

## Database Schema Requirements

This migration assumes the following tables exist:
- `users` table with `id` column (UUID)
- Proper authentication setup with `auth.uid()` function

## Rollback

To rollback this migration, run:
```sql
-- Drop triggers
DROP TRIGGER IF EXISTS create_user_notification_settings ON users;
DROP TRIGGER IF EXISTS update_user_notification_settings_updated_at ON user_notification_settings;
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;

-- Drop function
DROP FUNCTION IF EXISTS create_default_notification_settings();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables (this will also drop indexes and policies)
DROP TABLE IF EXISTS user_notification_settings;
DROP TABLE IF EXISTS notifications;
```

## Testing the Migration

After applying the migration, you can test it with:

```sql
-- Test notification creation
INSERT INTO notifications (user_id, type, title, body, data) 
VALUES (
  'your-user-id-here',
  'friend_request_received',
  'New Friend Request',
  'John Doe wants to be your friend',
  '{"fromUserId": "john-id", "fromUserName": "John Doe"}'::jsonb
);

-- Test notification settings
SELECT * FROM user_notification_settings WHERE user_id = 'your-user-id-here';

-- Test unread notifications query
SELECT COUNT(*) FROM notifications 
WHERE user_id = 'your-user-id-here' AND read = false;
```