-- Update SELECT policies and grants on public.users and public.group_memberships.
--
-- Reads of both tables now need a signed-in user, and each user can read:
--   users:             their own row, and people they have a reason to see
--                      (see public.can_view_user below).
--   group_memberships: their own rows, active rows in approved groups of their
--                      own church, active leaders of approved groups, their
--                      friends' active rows, active rows of groups they are an
--                      active member of, every row of groups they lead, and
--                      rows of their own church's groups if they are a church
--                      admin (existing policies).
-- Superadmins can read both tables across churches (web dashboard church switch).
--
-- Service-role callers (Edge Functions) bypass RLS and are not affected.

begin;

-- ---------------------------------------------------------------------------
-- Helper: may the current user read this person's users row?
-- security definer so it can look across users / group_memberships without
-- recursing into their own RLS policies.
-- ---------------------------------------------------------------------------
create or replace function public.can_view_user(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and target_user_id is not null
    and (
      -- own row
      target_user_id = auth.uid()

      -- superadmin
      or exists (
        select 1 from public.users me
        where me.id = auth.uid() and 'superadmin' = any (me.roles)
      )

      -- same church
      or exists (
        select 1
        from public.users me
        join public.users them on them.id = target_user_id
        where me.id = auth.uid()
          and me.church_id is not null
          and me.church_id = them.church_id
      )

      -- church admins (onboarding shows a service's admins before a church is chosen)
      or exists (
        select 1 from public.users them
        where them.id = target_user_id and 'church_admin' = any (them.roles)
      )

      -- friends and friend requests, either direction
      or exists (
        select 1 from public.friendships f
        where (f.user_id = auth.uid() and f.friend_id = target_user_id)
           or (f.friend_id = auth.uid() and f.user_id = target_user_id)
      )

      -- active leaders of approved groups (shown when browsing groups)
      or exists (
        select 1
        from public.group_memberships gm
        join public.groups g on g.id = gm.group_id
        where gm.user_id = target_user_id
          and gm.status = 'active'
          and gm.role = any (array['leader', 'admin'])
          and g.status = 'approved'
      )

      -- anyone with a membership row in a group the caller is active in
      -- (fellow members, and requesters for the group's leaders)
      or exists (
        select 1
        from public.group_memberships mine
        join public.group_memberships theirs on theirs.group_id = mine.group_id
        where mine.user_id = auth.uid()
          and mine.status = 'active'
          and theirs.user_id = target_user_id
      )

      -- referrer and referred person
      or exists (
        select 1 from public.referrals r
        where (r.referred_by_user_id = auth.uid() and r.referred_user_id = target_user_id)
           or (r.referred_user_id = auth.uid() and r.referred_by_user_id = target_user_id)
      )

      -- hosts of public events
      or exists (
        select 1 from public.events e
        where e.host_id = target_user_id and e.is_public = true
      )

      -- Focus Festival: tent hosts, car drivers, and applicants to the caller's tents/cars
      or exists (select 1 from focus_festival.tents t where t.host_id = target_user_id)
      or exists (select 1 from focus_festival.cars c where c.driver_id = target_user_id)
      or exists (
        select 1 from focus_festival.applications a
        where a.applicant_id = target_user_id
          and (
            exists (select 1 from focus_festival.tents t where t.id = a.resource_id and t.host_id = auth.uid())
            or exists (select 1 from focus_festival.cars c where c.id = a.resource_id and c.driver_id = auth.uid())
          )
      )
    );
$$;

alter function public.can_view_user(uuid) owner to postgres;
revoke all on function public.can_view_user(uuid) from public, anon;
grant execute on function public.can_view_user(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
drop policy if exists "Public can read user profiles" on public.users;

drop policy if exists "users_select_visible" on public.users;
create policy "users_select_visible" on public.users
  for select to authenticated
  using (public.can_view_user(id));

-- ---------------------------------------------------------------------------
-- group_memberships
-- ---------------------------------------------------------------------------
drop policy if exists "Anyone can read group memberships" on public.group_memberships;

-- church admins of any church could read every church's memberships;
-- memberships_select_church_admin already covers their own church.
drop policy if exists "gm_read_admin" on public.group_memberships;

-- active leaders: signed-in only, approved groups only
drop policy if exists "gm_select_public_leaders" on public.group_memberships;
create policy "gm_select_public_leaders" on public.group_memberships
  for select to authenticated
  using (
    status = 'active'
    and role = any (array['leader', 'admin'])
    and exists (
      select 1 from public.groups g
      where g.id = group_memberships.group_id and g.status = 'approved'
    )
  );

-- fellow members: active rows only
drop policy if exists "gm_select_group_members" on public.group_memberships;
create policy "gm_select_group_members" on public.group_memberships
  for select to authenticated
  using (status = 'active' and public.is_member_of_group(group_id));

-- friends: active rows only
drop policy if exists "gm_select_friends" on public.group_memberships;
create policy "gm_select_friends" on public.group_memberships
  for select to authenticated
  using (
    status = 'active'
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.user_id = auth.uid() and f.friend_id = group_memberships.user_id)
          or (f.friend_id = auth.uid() and f.user_id = group_memberships.user_id)
        )
    )
  );

-- browsing your own church's groups: active rows of approved groups
drop policy if exists "gm_select_same_church_active" on public.group_memberships;
create policy "gm_select_same_church_active" on public.group_memberships
  for select to authenticated
  using (
    status = 'active'
    and exists (
      select 1 from public.groups g
      where g.id = group_memberships.group_id
        and g.status = 'approved'
        and g.church_id is not null
        and g.church_id = public.current_user_church_id()
    )
  );

drop policy if exists "gm_select_superadmin" on public.group_memberships;
create policy "gm_select_superadmin" on public.group_memberships
  for select to authenticated
  using (public.current_user_has_role('superadmin'));

-- ---------------------------------------------------------------------------
-- Grants: the anon role has no use for personal-data tables.
-- (RLS still applies to authenticated; this removes anon's table access.)
-- ---------------------------------------------------------------------------
revoke all on table public.users from anon;
revoke all on table public.group_memberships from anon;
revoke all on table public.group_membership_notes from anon;
revoke all on table public.friendships from anon;
revoke all on table public.referrals from anon;
revoke all on table public.notifications from anon;
revoke all on table public.user_notification_settings from anon;
revoke all on table public.user_push_tokens from anon;
revoke all on table public.new_church_requests from anon;
revoke all on table public.tickets from anon;

commit;

notify pgrst, 'reload schema';
