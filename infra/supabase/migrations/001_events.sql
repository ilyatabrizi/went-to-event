create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null
);

create table if not exists public.events (
  id text primary key,
  category text not null,
  title text not null,
  description text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  venue_id uuid not null references public.venues(id),
  host_name text not null,
  going_count integer not null default 0 check (going_count >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.ticket_tiers (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  name text not null,
  description text not null,
  price_cents integer not null check (price_cents >= 0)
);

create index if not exists events_starts_at_idx on public.events (starts_at);
create index if not exists ticket_tiers_event_id_idx on public.ticket_tiers (event_id);

alter table public.venues enable row level security;
alter table public.events enable row level security;
alter table public.ticket_tiers enable row level security;
