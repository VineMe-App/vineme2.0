-- Policies for the `group-images` storage bucket.
-- Everyone can read the images, but only group leaders (active membership)
-- or church admins for the group’s church can create/update/delete.

create policy "Public read access to group-images"
on storage.objects
for select
using (
  bucket_id = 'group-images'
);

create policy "Group leaders and church admins manage group-images (insert)"
on storage.objects
for insert
with check (
  bucket_id = 'group-images'
  and (
    (
      split_part(name, '/', 1) = 'groups'
      and exists (
        select 1
        from groups g
        where g.id::text = split_part(name, '/', 2)
          and (
            exists (
          select 1
          from group_memberships gm
          where gm.group_id = g.id
            and gm.user_id = auth.uid()
            and gm.status = 'active'
            and gm.role in ('leader', 'admin')
        )
        or exists (
          select 1
          from users u
          where u.id = auth.uid()
            and u.church_id = g.church_id
            and u.roles @> array['church_admin']::text[]
        )
      )
    )
    or (
      split_part(name, '/', 1) = 'pending'
      and split_part(name, '/', 2) = auth.uid()::text
    )
  )
);

create policy "Group leaders and church admins manage group-images (update)"
on storage.objects
for update
using (
  bucket_id = 'group-images'
  and (
    (
      split_part(name, '/', 1) = 'groups'
      and exists (
        select 1
        from groups g
        where g.id::text = split_part(name, '/', 2)
          and (
            exists (
          select 1
          from group_memberships gm
          where gm.group_id = g.id
            and gm.user_id = auth.uid()
            and gm.status = 'active'
            and gm.role in ('leader', 'admin')
        )
        or exists (
          select 1
          from users u
          where u.id = auth.uid()
            and u.church_id = g.church_id
            and u.roles @> array['church_admin']::text[]
        )
      )
    )
    or (
      split_part(name, '/', 1) = 'pending'
      and split_part(name, '/', 2) = auth.uid()::text
    )
  )
)
with check (
  bucket_id = 'group-images'
  and (
    (
      split_part(name, '/', 1) = 'groups'
      and exists (
        select 1
        from groups g
        where g.id::text = split_part(name, '/', 2)
          and (
            exists (
          select 1
          from group_memberships gm
          where gm.group_id = g.id
            and gm.user_id = auth.uid()
            and gm.status = 'active'
            and gm.role in ('leader', 'admin')
        )
        or exists (
          select 1
          from users u
          where u.id = auth.uid()
            and u.church_id = g.church_id
            and u.roles @> array['church_admin']::text[]
        )
      )
    )
    or (
      split_part(name, '/', 1) = 'pending'
      and split_part(name, '/', 2) = auth.uid()::text
    )
  )
);

create policy "Group leaders and church admins manage group-images (delete)"
on storage.objects
for delete
using (
  bucket_id = 'group-images'
  and (
    (
      split_part(name, '/', 1) = 'groups'
      and exists (
        select 1
        from groups g
        where g.id::text = split_part(name, '/', 2)
          and (
            exists (
          select 1
          from group_memberships gm
          where gm.group_id = g.id
            and gm.user_id = auth.uid()
            and gm.status = 'active'
            and gm.role in ('leader', 'admin')
        )
        or exists (
          select 1
          from users u
          where u.id = auth.uid()
            and u.church_id = g.church_id
            and u.roles @> array['church_admin']::text[]
        )
      )
    )
    or (
      split_part(name, '/', 1) = 'pending'
      and split_part(name, '/', 2) = auth.uid()::text
    )
  )
);
