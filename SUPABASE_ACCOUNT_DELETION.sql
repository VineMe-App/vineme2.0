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
  v_sole_leader_groups text[];
begin
  -- Get the authenticated user's ID
  v_user_id := auth.uid();
  
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Check if user is the sole leader of any active groups
  select array_agg(g.title)
  into v_sole_leader_groups
  from public.groups g
  where g.id in (
    -- Groups where this user is a leader
    select gm1.group_id
    from public.group_memberships gm1
    where gm1.user_id = v_user_id
      and gm1.role = 'leader'
      and gm1.status = 'active'
      and g.status = 'approved'
    -- But the group has no other active leaders
    and not exists (
      select 1
      from public.group_memberships gm2
      where gm2.group_id = gm1.group_id
        and gm2.user_id != v_user_id
        and gm2.role in ('leader', 'admin')
        and gm2.status = 'active'
    )
  );

  -- If user is sole leader of any groups, prevent deletion
  if array_length(v_sole_leader_groups, 1) > 0 then
    raise exception 'SOLE_LEADER: You are the sole leader of the following group(s): %. Please assign a new leader or close the group before deleting your account.', 
      array_to_string(v_sole_leader_groups, ', ');
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

  -- 7. No need to change group status
  -- Since we block deletion if user is sole leader,
  -- any groups they created will have other leaders and remain active

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

