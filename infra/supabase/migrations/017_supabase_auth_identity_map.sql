create table if not exists public.auth_user_identities (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  database_user_id text not null unique,
  email text,
  created_at timestamptz not null default now()
);

alter table public.auth_user_identities enable row level security;
revoke all on public.auth_user_identities from anon, authenticated;
grant all on public.auth_user_identities to service_role;

create index if not exists auth_user_identities_database_user_id_idx
  on public.auth_user_identities (database_user_id);
