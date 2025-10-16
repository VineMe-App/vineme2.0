# Supabase RPC Integration Guide

## Overview

This guide explains how the Supabase RPC functions for group creation and approval have been integrated into your VineMe application.

## What Was Changed

### 1. Database Layer (Supabase)

Your SQL functions are already set up correctly with these components:

✅ **Helper Function**: `fn_current_user_has_role()` - Checks if user has a specific role
✅ **Trigger**: `trg_groups_set_created_by` - Automatically sets `created_by` field
✅ **Trigger**: `trg_groups_creator_leader` - Automatically creates pending membership when group is created
✅ **RPC**: `request_group()` - Creates a new group request with pending status
✅ **RPC**: `approve_group()` - Approves a group and activates creator's leader membership
✅ **RPC**: `deny_group()` - Denies a group and marks membership as inactive

### 2. Application Layer (TypeScript)

#### Updated Files:

**`src/services/groupCreation.ts`**
- ✅ Replaced direct `INSERT` with `supabase.rpc('request_group', {...})`
- ✅ Removed manual membership creation logic (now handled by triggers)
- ✅ Simplified error handling

**`src/services/admin.ts`**
- ✅ Updated `approveGroup()` to use `supabase.rpc('approve_group', {...})`
- ✅ Updated `declineGroup()` to use `supabase.rpc('deny_group', {...})`
- ✅ Removed manual status updates (now handled by RPCs)

## How It Works

### Group Creation Flow (Regular User)

```typescript
// User creates a group
const result = await groupCreationService.createGroupRequest(groupData, userId);

// Behind the scenes:
// 1. RPC request_group() is called
// 2. Group is created with status = 'pending'
// 3. Trigger automatically sets created_by = auth.uid()
// 4. Trigger automatically creates group_membership with role='leader', status='pending'
// 5. Creator is now waiting for church admin approval
```

### Group Approval Flow (Church Admin)

```typescript
// Church admin approves the group
await groupAdminService.approveGroup(groupId, adminId);

// Behind the scenes:
// 1. RPC approve_group() is called
// 2. Group status is updated to 'approved'
// 3. Creator's membership is updated to status='active' with role='leader'
// 4. Creator now has active leadership of the group
```

### Group Denial Flow (Church Admin)

```typescript
// Church admin denies the group
await groupAdminService.declineGroup(groupId, adminId);

// Behind the scenes:
// 1. RPC deny_group() is called
// 2. Group status is updated to 'denied'
// 3. Creator's membership is updated to status='inactive'
```

## User Roles and Permissions

### Regular User (role: 'user')
- ✅ Can create group requests (status: pending)
- ✅ Gets pending leader membership automatically
- ✅ Becomes active leader after church admin approval

### Church Admin (role: 'church_admin')
- ✅ Can approve group requests
- ✅ Can deny group requests
- ✅ Can view all groups in their church

### Group Membership Roles
- `member` - Regular group member
- `leader` - Group leader (can manage group)
- `admin` - Group admin (full control)

### Group Membership Status
- `pending` - Waiting for approval (used when group is created by regular user)
- `active` - Active member/leader
- `inactive` - Deactivated membership

## Testing the Integration

### 1. Test Group Creation as Regular User

```typescript
// As a regular user
const groupData = {
  title: 'Young Adults Fellowship',
  description: 'Meets every Wednesday',
  meeting_day: 'Wednesday',
  meeting_time: '19:00:00',
  location: { address: '123 Main St' },
  service_id: 'your-service-id',
  church_id: 'your-church-id',
};

const result = await groupCreationService.createGroupRequest(
  groupData,
  currentUser.id
);

// Check the results:
// - Group should have status='pending'
// - You should have a group_membership with role='leader', status='pending'
```

### 2. Test Group Approval as Church Admin

```typescript
// As a church admin
await groupAdminService.approveGroup(groupId, adminId);

// Check the results:
// - Group should have status='approved'
// - Creator's membership should have role='leader', status='active'
```

### 3. Test Group Denial as Church Admin

```typescript
// As a church admin
await groupAdminService.declineGroup(groupId, adminId, 'Optional reason');

// Check the results:
// - Group should have status='denied'
// - Creator's membership should have status='inactive'
```

## SQL Update Required

Run this updated SQL in your Supabase SQL Editor to ensure the approve_group function sets the correct status:

```sql
-- See SUPABASE_GROUP_RPC_UPDATE.sql for the complete SQL
```

## Key Benefits

1. **Atomic Operations**: All related updates happen in a single transaction
2. **Security**: Server-side validation ensures only church admins can approve/deny
3. **Consistency**: Triggers ensure memberships are always created correctly
4. **Simplified Code**: Less manual logic in TypeScript, more in database
5. **Better Performance**: Fewer round trips to database

## Common Issues

### Issue: "Only church_admin can approve groups"
**Solution**: Ensure the user has 'church_admin' in their roles array in the users table

### Issue: "Group not found or created_by is null"
**Solution**: The trigger should automatically set created_by. Check that the trigger is enabled.

### Issue: RLS policy violation
**Solution**: Ensure your RLS policies allow:
- Authenticated users to read their own memberships
- Church admins to read all memberships in their church
- No direct INSERT permissions (handled by triggers)

## Next Steps

1. ✅ Run the updated SQL in Supabase (SUPABASE_GROUP_RPC_UPDATE.sql)
2. ✅ Test group creation with a regular user account
3. ✅ Test group approval with a church admin account
4. ✅ Verify notifications are working correctly
5. ✅ Check that the group management UI shows correct statuses

## Questions?

The code changes are complete and ready to use. The RPC functions provide a clean, secure way to manage group creation and approval workflows while maintaining data consistency.

