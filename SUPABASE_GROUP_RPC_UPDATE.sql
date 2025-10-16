-- Fixed approve_group function to set status to 'approved' (matching TypeScript expectations)
create or replace function public.approve_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  creator_id uuid;
begin
  if not public.fn_current_user_has_role('church_admin') then
    raise exception 'Only church_admin can approve groups';
  end if;

  select created_by into creator_id
  from public.groups
  where id = p_group_id;

  if creator_id is null then
    raise exception 'Group not found or created_by is null';
  end if;

  -- Update group status to approved
  update public.groups
     set status = 'approved',
         updated_at = now()
   where id = p_group_id;

  if not found then
    raise exception 'Group not found';
  end if;

  -- Update the pending membership to active with leader role
  insert into public.group_memberships (group_id, user_id, role, status, joined_at, journey_status)
  values (p_group_id, creator_id, 'leader', 'active', now(), 3)
  on conflict (group_id, user_id) do update
    set role = 'leader',
        status = 'active',
        joined_at = coalesce(public.group_memberships.joined_at, now()),
        journey_status = 3;
end;
$$;

