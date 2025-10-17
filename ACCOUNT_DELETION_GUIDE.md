# Account Deletion Implementation Guide

## Overview

This guide explains how account deletion works in VineMe and why the provided code samples differ from what you need.

## ✅ What Was Implemented

### 1. SQL RPC Function (`delete_my_account`)

**Location:** `SUPABASE_ACCOUNT_DELETION.sql`

This function safely deletes all user data in the correct order:

```sql
delete_my_account()
  → Delete group memberships
  → Delete friendships (both directions)
  → Delete join requests
  → Delete referrals
  → Delete notifications
  → Delete notification settings
  → Update groups created by user (mark as pending)
  → Delete user record
```

### 2. TypeScript Service Update

**File:** `src/services/users.ts`

Updated the `deleteAccount` method to:
- Verify user is deleting their own account
- Call the `delete_my_account` RPC
- Return success/error

### 3. UI Flow (Already Exists)

**File:** `src/app/(tabs)/profile.tsx`

The existing flow already:
- Shows confirmation alert
- Calls `deleteAccount`
- Signs out the user
- Redirects to sign-in page

## 🔍 Why Server-Side Code Wasn't Needed

The code snippet you provided includes server-side Next.js code:

```typescript
// server (Node) – use your service role key here
const admin = createClient(..., process.env.SUPABASE_SERVICE_ROLE_KEY!);
await admin.auth.admin.deleteUser(userId);
```

**You DON'T need this because:**

1. **You're using React Native** (mobile app), not Next.js (web app)
2. **No backend server** to run server-side code
3. **RPC function runs server-side** - It has `security definer` which means it runs with elevated privileges

## 🎯 Current Flow

```
User clicks "Delete Account"
    ↓
Confirmation alert shown
    ↓
Call deleteAccount(userId)
    ↓
Verify user owns account
    ↓
Check if sole leader ← NEW!
    ↓
├─ Is sole leader?
│  └─ BLOCK deletion
│     └─ Show error message
│        "You are the sole leader of [Group Name]"
│        "Please assign a new leader or close the group"
└─ Not sole leader?
   └─ Call RPC: delete_my_account()
      ↓
      Cascades through all tables
      ↓
      User record deleted
      ↓
      Sign out user
      ↓
      Redirect to sign-in
```

## ⚠️ Auth User Deletion

### Current Behavior

The RPC function deletes the user from your `users` table but **not** from Supabase Auth.

### Why This Matters

- User can still sign in (auth identity exists)
- But they'll have no profile data
- App should handle this edge case

### Options to Fix

#### Option 1: Database Trigger (Recommended)

Create a trigger that calls a webhook when a user is deleted:

```sql
-- This would require a webhook endpoint to call auth.admin.deleteUser
-- Not practical for React Native apps
```

#### Option 2: Database Webhook (Better for Mobile)

In Supabase Dashboard:
1. Go to Database → Webhooks
2. Create webhook on `users` table DELETE
3. Point to Edge Function that calls `auth.admin.deleteUser()`

#### Option 3: Handle in App (Simplest)

Since the user signs out anyway, they'd need to sign in again. You can:

1. Add a check in your sign-in flow:
```typescript
// After sign-in
const { data: profile } = await supabase
  .from('users')
  .select('*')
  .eq('id', user.id)
  .single();

if (!profile) {
  // User deleted their account but auth still exists
  // Sign them out
  await supabase.auth.signOut();
  Alert.alert('Account Deleted', 'Your account has been deleted.');
}
```

2. Or delete auth user before deleting data:
```typescript
async deleteAccount(userId: string): Promise<UserServiceResponse<boolean>> {
  // ... existing code ...
  
  // After RPC call succeeds
  const { error: rpcError } = await supabase.rpc('delete_my_account');
  if (rpcError) {
    return { data: null, error: new Error(rpcError.message) };
  }
  
  // Delete the auth user last
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  // Note: This requires service role key which isn't available in client
  
  return { data: true, error: null };
}
```

## 🚀 Deployment Steps

### 1. Run SQL in Supabase

Open Supabase SQL Editor and run:
```sql
-- Copy contents from SUPABASE_ACCOUNT_DELETION.sql
```

### 2. Test the Flow

1. Create a test user account
2. Join some groups, add friends
3. Go to Profile → Delete Account
4. Confirm deletion
5. Verify:
   - User is signed out
   - Database has no user record
   - Related data is deleted
   - Auth user still exists (expected)

### 3. (Optional) Set Up Auth Deletion

If you want to also delete the auth user, use one of the options above.

## 📊 What Gets Deleted

| Data Type | Action |
|-----------|--------|
| Group Memberships | ✅ Deleted |
| Friendships | ✅ Deleted (both directions) |
| Join Requests | ✅ Deleted |
| Referrals | ✅ Deleted |
| Notifications | ✅ Deleted |
| Notification Settings | ✅ Deleted |
| Groups Created | ⚠️ Marked as pending (for admin review) |
| User Record | ✅ Deleted |
| Auth Identity | ❌ Not deleted (requires webhook) |

## 🔒 Security

- ✅ RPC function runs with `security definer` (elevated privileges)
- ✅ Verifies `auth.uid()` to ensure user is authenticated
- ✅ Client code verifies user is deleting their own account
- ✅ Granted only to `authenticated` users, not `anon`

## 🐛 Troubleshooting

### Error: "Not authenticated"
- User is not signed in
- Session expired
- Refresh the session before deletion

### Error: "You can only delete your own account"
- Trying to delete another user's account
- Session mismatch

### Error: "You are the sole leader of..."
- **NEW!** User is the only leader of one or more active groups
- **Solution:** User must either:
  1. Assign another member as leader (promote someone)
  2. Close the group (if no longer needed)
  3. Have another admin/leader added first

### Error: "permission denied for function delete_my_account"
- Run the GRANT statement in the SQL
- User not in `authenticated` role

### Groups Still Showing After Deletion
- Expected behavior (if user was co-leader)
- Groups are marked as pending for admin review
- Admins can reassign or delete them

## 📝 Notes

- Account deletion is **permanent** (cannot be undone)
- User is immediately signed out
- Auth identity remains (harmless - just takes up storage)
- Consider adding a grace period (soft delete with cleanup job)
- Consider exporting user data before deletion (GDPR compliance)

## 🎁 Future Enhancements

1. **Soft Delete** - Mark as deleted, clean up after 30 days
2. **Data Export** - Let users download their data first
3. **Grace Period** - Allow account recovery within X days
4. **Email Notification** - Send confirmation email
5. **Complete Auth Deletion** - Set up webhook for full cleanup

