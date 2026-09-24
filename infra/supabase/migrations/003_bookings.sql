create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null references public.events(id),
  status text not null default 'confirmed' check (status in ('pending', 'confirmed', 'cancelled')),
  total_cents integer not null check (total_cents >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.booking_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  ticket_tier_id text not null references public.ticket_tiers(id),
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0)
);

create index if not exists bookings_user_id_idx on public.bookings (user_id, created_at desc);
create index if not exists booking_items_booking_id_idx on public.booking_items (booking_id);

alter table public.bookings enable row level security;
alter table public.booking_items enable row level security;

create or replace function public.create_booking(
  p_user_id uuid,
  p_event_id text,
  p_ticket_tier_id text,
  p_quantity integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  tier public.ticket_tiers%rowtype;
  booking_id uuid;
  total integer;
begin
  if p_quantity < 1 or p_quantity > 10 then
    raise exception 'Quantity must be between 1 and 10';
  end if;

  select * into tier
  from public.ticket_tiers
  where id = p_ticket_tier_id and event_id = p_event_id;

  if not found then
    raise exception 'Ticket tier does not belong to this event';
  end if;

  total := tier.price_cents * p_quantity;

  insert into public.bookings (user_id, event_id, status, total_cents)
  values (p_user_id, p_event_id, 'confirmed', total)
  returning id into booking_id;

  insert into public.booking_items (booking_id, ticket_tier_id, quantity, unit_price_cents)
  values (booking_id, tier.id, p_quantity, tier.price_cents);

  return jsonb_build_object(
    'id', booking_id,
    'event_id', p_event_id,
    'ticket_tier_id', tier.id,
    'quantity', p_quantity,
    'status', 'confirmed',
    'total_cents', total
  );
end;
$$;

revoke execute on function public.create_booking(uuid, text, text, integer) from public;
grant execute on function public.create_booking(uuid, text, text, integer) to service_role;
