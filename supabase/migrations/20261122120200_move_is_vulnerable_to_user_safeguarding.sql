-- Move users.is_vulnerable into its own table, readable and writable only by the
-- service role (Edge Functions mark-user-vulnerable and
-- sync-churchsuite-vulnerable-tags). Deploy those two functions together with
-- this migration: until they are redeployed they still write users.is_vulnerable.

begin;

create table if not exists public.user_safeguarding (
  user_id uuid primary key references public.users (id) on delete cascade,
  is_vulnerable boolean not null default false,
  updated_at timestamptz not null default now()
);

comment on table public.user_safeguarding is
  'Safeguarding flags per user. Service role only: no client policies.';
comment on column public.user_safeguarding.is_vulnerable is
  'Flag indicating that the user is considered vulnerable';

alter table public.user_safeguarding enable row level security;

revoke all on table public.user_safeguarding from public, anon, authenticated;
grant all on table public.user_safeguarding to service_role;

insert into public.user_safeguarding (user_id, is_vulnerable, updated_at)
select u.id, true, now()
from public.users u
where u.is_vulnerable is true
on conflict (user_id) do update
  set is_vulnerable = excluded.is_vulnerable,
      updated_at = excluded.updated_at;

alter table public.users drop column if exists is_vulnerable;

commit;

notify pgrst, 'reload schema';
