create table if not exists public.ticket_codes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  ticket_number integer not null check (ticket_number > 0),
  token_hash text not null unique,
  checked_in_at timestamptz,
  checked_in_by text,
  created_at timestamptz not null default now(),
  unique (booking_id, ticket_number)
);

create index if not exists ticket_codes_booking_id_idx on public.ticket_codes (booking_id);
create index if not exists ticket_codes_checked_in_idx on public.ticket_codes (checked_in_at);

alter table public.ticket_codes enable row level security;
revoke all on public.ticket_codes from anon, authenticated;
grant all on public.ticket_codes to service_role;
