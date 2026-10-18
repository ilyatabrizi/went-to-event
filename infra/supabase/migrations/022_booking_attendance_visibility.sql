alter table public.bookings add column if not exists show_attendance boolean not null default true;

drop function if exists public.create_booking(text, text, text, integer);

create or replace function public.create_booking(
  p_user_id text, p_event_id text, p_ticket_tier_id text, p_quantity integer, p_show_attendance boolean default true
) returns jsonb language plpgsql security definer set search_path = public as $$
declare tier public.ticket_tiers%rowtype; booking_id uuid; total integer;
begin
  if p_quantity < 1 or p_quantity > 10 then raise exception 'Quantity must be between 1 and 10'; end if;
  select * into tier from public.ticket_tiers where id = p_ticket_tier_id and event_id = p_event_id;
  if not found then raise exception 'Ticket tier does not belong to this event'; end if;
  total := tier.price_cents * p_quantity;
  insert into public.bookings (user_id, event_id, status, total_cents, show_attendance) values (p_user_id, p_event_id, 'confirmed', total, coalesce(p_show_attendance, true)) returning id into booking_id;
  insert into public.booking_items (booking_id, ticket_tier_id, quantity, unit_price_cents) values (booking_id, tier.id, p_quantity, tier.price_cents);
  return jsonb_build_object('id', booking_id, 'event_id', p_event_id, 'ticket_tier_id', tier.id, 'quantity', p_quantity, 'status', 'confirmed', 'total_cents', total, 'show_attendance', coalesce(p_show_attendance, true));
end; $$;

revoke execute on function public.create_booking(text, text, text, integer, boolean) from public, anon, authenticated;
grant execute on function public.create_booking(text, text, text, integer, boolean) to service_role;
