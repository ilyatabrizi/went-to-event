-- Clerk IDs are strings, while the original Supabase Auth schema used UUIDs.
-- Keep the old values as text so existing profiles/bookings remain addressable.
do $$
begin
  drop policy if exists "Users can read their own profile" on public.profiles;
  drop policy if exists "Users can insert their own profile" on public.profiles;
  drop policy if exists "Users can update their own profile" on public.profiles;
  alter table public.profiles drop constraint if exists profiles_id_fkey;
  alter table public.profiles alter column id type text using id::text;
  alter table public.bookings drop constraint if exists bookings_user_id_fkey;
  alter table public.bookings alter column user_id type text using user_id::text;
exception when undefined_table then
  null;
end $$;

create table if not exists public.user_identities (
  clerk_user_id text primary key,
  database_user_id text not null unique,
  legacy_supabase_user_id uuid unique,
  email text,
  created_at timestamptz not null default now()
);

create index if not exists user_identities_email_idx on public.user_identities (lower(email));

drop function if exists public.create_booking(uuid, text, text, integer);

create or replace function public.create_booking(
  p_user_id text,
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

revoke execute on function public.create_booking(text, text, text, integer) from public;
grant execute on function public.create_booking(text, text, text, integer) to service_role;
