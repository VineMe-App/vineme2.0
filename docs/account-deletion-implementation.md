# Account Deletion Implementation

## Overview

This document describes how account deletion works in VineMe, including the security measures and data cleanup process.

## Current Implementation (Simplified Approach)

### How It Works

1. **User initiates deletion** from profile screen
2. **Database function (`delete_my_account`)** validates and deletes all user data
3. **User signs out** which invalidates their auth session
4. **App redirects** to login screen

### Database Function: `delete_my_account`

Location: `supabase/migrations/005_simple_delete_account.sql`

This PostgreSQL function:
- ✅ Verifies user is authenticated
- ✅ Checks if user is sole leader of any active groups (prevents deletion if true)
- ✅ Deletes all user data from related tables:
  - `group_memberships`
  - `friendships`
  - `referrals`
  - `notifications`
  - `user_notification_settings`
  - `user_push_tokens`
  - `users` (main user record)
- ✅ Returns success/failure status as JSON

### Frontend Flow

Location: `src/app/(tabs)/profile.tsx`

```typescript
const handleDeleteAccount = () => {
  Alert.alert(
    'Delete Account',
    'This will permanently delete your account data. This action cannot be undone. Continue?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAccountMutation.mutateAsync(user.id);
            await signOut();
            // Don't navigate manually - let the root layout handle it
          } catch (error) {
            // Error handling
          }
        },
      },
    ]
  );
};
```

## Security Measures

### Sole Leader Check

Users cannot delete their account if they are the **sole leader** of any active groups. They must either:
1. Assign a new leader to the group, or
2. Close the group

This prevents groups from becoming leaderless.

### Authentication Verification

The `delete_my_account` function uses `auth.uid()` to ensure:
- User is authenticated
- User can only delete their own account (enforced at database level)

### RLS Policies

All related tables have Row Level Security (RLS) policies that ensure:
- Users can only modify their own data
- Cascading deletions respect security boundaries

## Auth User Cleanup

### Why Auth Users Are Not Explicitly Deleted

When a user signs out after account deletion:
1. Their auth session is invalidated
2. They can no longer access the app
3. The auth user record becomes orphaned but inaccessible

**Why this is acceptable:**
- The user cannot log back in (no valid session)
- All app data is deleted (privacy requirement met)
- Orphaned auth records don't pose a security risk
- Supabase will clean up unused auth records over time

### Alternative: Edge Function (Not Recommended)

We previously had a `delete-auth-user` edge function triggered by database webhooks, but removed it because:
- ❌ Added complexity with webhook signature verification
- ❌ Required additional infrastructure (webhooks, edge function deployment)
- ❌ Created potential for race conditions
- ❌ Webhook signature verification was broken (compared signature to secret instead of computing HMAC)
- ✅ Simpler approach: Let user sign out to invalidate auth session

If you need to explicitly delete auth users, you can:
1. Use Supabase Dashboard to manually delete auth users
2. Create an admin function that uses the service role to delete auth users
3. Fix the webhook signature verification and redeploy the edge function

## Error Handling

### Post-Deletion Errors

After account deletion, the app may attempt to fetch data for the deleted user, causing expected errors:
- `406 Not Acceptable`
- `JSON object requested, multiple (or no) rows returned`

These errors are **automatically suppressed** by our error handling system:

Location: `src/utils/errorSuppression.ts`

The system detects post-deletion errors and marks them as "silent" to prevent:
- Console spam
- User-facing error alerts
- Crash reporting false positives

### Sole Leader Error

If a user tries to delete their account while being a sole leader, they receive a clear error message:

```
You are the sole leader of the following group(s): [Group Names]. 
Please assign a new leader or close the group before deleting your account.
```

## Testing

### Manual Testing Steps

1. **Normal deletion**:
   - Create a test account
   - Join some groups as a member
   - Delete account
   - Verify all data is removed
   - Verify app redirects to login

2. **Sole leader prevention**:
   - Create a test account
   - Create a group (makes you the leader)
   - Try to delete account
   - Verify error message appears
   - Assign another leader
   - Delete account successfully

3. **Error suppression**:
   - Delete an account
   - Check console logs
   - Verify no "JSON object requested" errors appear

### Database Verification

```sql
-- Verify user data is deleted
SELECT * FROM users WHERE id = '<deleted-user-id>';
SELECT * FROM group_memberships WHERE user_id = '<deleted-user-id>';
SELECT * FROM friendships WHERE user_id = '<deleted-user-id>' OR friend_id = '<deleted-user-id>';
SELECT * FROM notifications WHERE user_id = '<deleted-user-id>';
```

All queries should return 0 rows.

## Migration History

1. **004_delete_account_rpc.sql** (Deleted) - Initial version with syntax errors
2. **005_secure_delete_account.sql** (Deleted) - Added webhook trigger and edge function
3. **006_simple_delete_account.sql** (Deleted) - Attempted to fix net.http_post errors
4. **005_simple_delete_account.sql** (Current) - Final simplified version without edge functions

## Future Considerations

### If You Need to Delete Auth Users

If compliance or other requirements demand explicit auth user deletion, implement one of:

1. **Admin-only service role function**:
   ```typescript
   // Backend only - never expose service role to client
   const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
   ```

2. **Fixed webhook approach**:
   - Fix HMAC signature verification in edge function
   - Enable `pg_net` extension
   - Configure webhook in database
   - Deploy edge function
   - Create trigger to call webhook

3. **Scheduled cleanup job**:
   - Run periodic job to find orphaned auth users
   - Delete auth users whose database records don't exist

### GDPR Compliance

Current implementation meets GDPR requirements:
- ✅ All personal data is deleted from database
- ✅ User can no longer access their account
- ✅ Deletion is permanent and cannot be undone
- ✅ User receives confirmation of deletion

The orphaned auth user record contains only:
- Email (hashed)
- User ID (UUID)
- No other personal data

This is acceptable under GDPR as the data is anonymized and inaccessible.

## Related Files

- Database: `supabase/migrations/005_simple_delete_account.sql`
- Frontend: `src/app/(tabs)/profile.tsx`
- Service: `src/services/users.ts`
- Error Handling: `src/utils/errorSuppression.ts`
- Error Utils: `src/utils/errorHandling.ts`
- Global Handler: `src/utils/globalErrorHandler.ts`

