create table if not exists public.business_leads (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  business_name text not null,
  niche text not null,
  city text not null,
  phone text not null,
  email text,
  source_page text not null default 'business-join',
  elapsed_ms integer not null default 0,
  created_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed'))
);

create index if not exists business_leads_created_at_idx
  on public.business_leads (created_at desc);

alter table public.business_leads enable row level security;
revoke all on public.business_leads from anon, authenticated;
grant all on public.business_leads to service_role;
