-- ==========================================
-- ACCOUNT DELETION RPC
-- ==========================================
-- This function safely deletes a user's account and all related data
-- Run this in Supabase SQL Editor

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  -- Get the authenticated user's ID
  v_user_id := auth.uid();
  
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Log the deletion attempt for audit purposes (optional)
  raise notice 'Deleting account for user: %', v_user_id;

  -- 1. Delete group memberships (both as member and leader)
  delete from public.group_memberships
  where user_id = v_user_id;

  -- 2. Delete friendships (both directions)
  delete from public.friendships
  where user_id = v_user_id or friend_id = v_user_id;

  -- 3. Delete join requests
  delete from public.join_requests
  where user_id = v_user_id;

  -- 4. Delete referrals (both as referrer and referee)
  delete from public.referrals
  where referrer_id = v_user_id or referred_user_id = v_user_id;

  -- 5. Delete notifications (both sent and received)
  delete from public.notifications
  where recipient_id = v_user_id;

  -- 6. Delete notification settings
  delete from public.notification_settings
  where user_id = v_user_id;

  -- 7. Handle groups created by the user
  -- Option A: Delete groups if they have no other leaders
  -- Option B: Transfer ownership to another leader
  -- Option C: Just mark groups as needing new leader
  -- For now, we'll mark them and let church admins handle it
  update public.groups
  set status = 'pending',
      updated_at = now()
  where created_by = v_user_id
    and status = 'approved';

  -- 8. Finally, delete the user record
  delete from public.users
  where id = v_user_id;

  raise notice 'Account deleted successfully for user: %', v_user_id;
end;
$$;

-- Grant execute permission to authenticated users only
grant execute on function public.delete_my_account() to authenticated;

-- Revoke from anon to prevent unauthorized access
revoke execute on function public.delete_my_account() from anon;

