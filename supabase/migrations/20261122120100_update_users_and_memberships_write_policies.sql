-- Update write rules on public.users, public.group_memberships and public.groups.
--
-- 1. users: roles and churchsuite_id can only be changed by the
--    service role or by database functions (not by direct client writes).
-- 2. group_memberships: direct client inserts are limited to the user's own
--    pending request (existing "Users can request to join a group" policy).
--    The group-creator trigger now runs as its owner, so it no longer needs a
--    broad insert policy.
-- 3. group_memberships: church-admin updates are limited to their own church
--    (existing "Church admins can manage group memberships" policy).
-- 4. groups: members creating a group directly can only create it as pending.

begin;

-- ---------------------------------------------------------------------------
-- 1. users: protected columns
-- ---------------------------------------------------------------------------
create or replace function public.guard_users_protected_columns()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  existing_roles text[];
begin
  -- Only direct client requests are restricted. Service role, postgres and
  -- security definer functions (current_user = owner) pass through.
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- An upsert of an existing row fires this before the conflict check, so
    -- allow the roles the row already has.
    select u.roles into existing_roles from public.users u where u.id = new.id;
    if new.roles is distinct from coalesce(existing_roles, array['user']::text[]) then
      raise exception 'roles cannot be set from the client' using errcode = '42501';
    end if;
    if new.churchsuite_id is not null and existing_roles is null then
      raise exception 'churchsuite_id cannot be set from the client' using errcode = '42501';
    end if;
    return new;
  end if;

  -- UPDATE
  if new.roles is distinct from old.roles then
    raise exception 'roles cannot be changed from the client' using errcode = '42501';
  end if;
  if new.churchsuite_id is distinct from old.churchsuite_id then
    raise exception 'churchsuite_id cannot be changed from the client' using errcode = '42501';
  end if;
  return new;
end;
$$;

alter function public.guard_users_protected_columns() owner to postgres;
revoke all on function public.guard_users_protected_columns() from public, anon, authenticated;

drop trigger if exists trg_users_guard_protected_columns on public.users;
create trigger trg_users_guard_protected_columns
  before insert or update on public.users
  for each row execute function public.guard_users_protected_columns();

-- ---------------------------------------------------------------------------
-- 2. group_memberships inserts
-- ---------------------------------------------------------------------------
create or replace function public.fn_add_creator_as_pending_leader()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is null then
    return new;
  end if;

  -- Insert creator as active leader (not pending)
  insert into public.group_memberships
    (group_id, user_id, role, status, joined_at, journey_status, referral_id)
  values
    (new.id, new.created_by, 'leader', 'active', now(), 3, null)
  on conflict (group_id, user_id) do update
    set role = excluded.role,
        status = excluded.status,
        joined_at = excluded.joined_at,
        journey_status = excluded.journey_status;

  return new;
end;
$$;

alter function public.fn_add_creator_as_pending_leader() owner to postgres;

drop policy if exists "gm_insert_trigger" on public.group_memberships;

-- ---------------------------------------------------------------------------
-- 3. group_memberships updates by church admins: own church only
-- ---------------------------------------------------------------------------
drop policy if exists "gm_update_admin" on public.group_memberships;

-- ---------------------------------------------------------------------------
-- 4. groups created directly by members start as pending
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated service members can create groups" on public.groups;
create policy "Authenticated service members can create groups" on public.groups
  for insert to authenticated
  with check (
    status = 'pending'
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.service_id is not null
    )
    and service_id = (
      select u.service_id from public.users u where u.id = auth.uid()
    )
  );

commit;

notify pgrst, 'reload schema';
