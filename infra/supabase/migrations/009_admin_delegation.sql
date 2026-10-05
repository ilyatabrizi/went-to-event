create table if not exists public.app_admins (
  clerk_user_id text primary key,
  added_by text not null,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;
revoke all on public.app_admins from anon, authenticated;
grant all on public.app_admins to service_role;
