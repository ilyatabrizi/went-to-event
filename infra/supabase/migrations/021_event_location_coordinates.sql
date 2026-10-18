alter table public.venues add column if not exists latitude double precision, add column if not exists longitude double precision;

drop function if exists public.create_event_for_verified_user(text, text, text, text, timestamptz, timestamptz, text, text, jsonb);

create or replace function public.create_event_for_verified_user(
  p_user_id text, p_category text, p_title text, p_description text, p_starts_at timestamptz, p_ends_at timestamptz,
  p_venue_name text, p_venue_address text, p_latitude double precision, p_longitude double precision, p_ticket_tiers jsonb
) returns text language plpgsql security definer set search_path = public as $$
declare profile_row public.profiles%rowtype; new_venue_id uuid; new_event_id text := 'event_' || replace(gen_random_uuid()::text, '-', '');
begin
  select * into profile_row from public.profiles where id = p_user_id and verification_status = 'verified' for update;
  if not found then raise exception using errcode = '42501', message = 'Verified account required to create events'; end if;
  if p_ends_at <= p_starts_at then raise exception using errcode = '22023', message = 'Event end must be after start'; end if;
  if p_latitude < -90 or p_latitude > 90 or p_longitude < -180 or p_longitude > 180 then raise exception using errcode = '22023', message = 'Event location is invalid'; end if;
  if jsonb_typeof(p_ticket_tiers) <> 'array' or jsonb_array_length(p_ticket_tiers) < 1 or jsonb_array_length(p_ticket_tiers) > 8 then raise exception using errcode = '22023', message = 'Provide between one and eight ticket tiers'; end if;
  insert into public.venues (name, address, latitude, longitude) values (p_venue_name, p_venue_address, p_latitude, p_longitude) returning id into new_venue_id;
  insert into public.events (id, category, title, description, starts_at, ends_at, venue_id, host_name, host_user_id) values (new_event_id, p_category, p_title, p_description, p_starts_at, p_ends_at, new_venue_id, coalesce(nullif(profile_row.display_name, ''), nullif(profile_row.username, ''), 'Went To Event member'), p_user_id);
  insert into public.ticket_tiers (id, event_id, name, description, price_cents) select 'tier_' || replace(gen_random_uuid()::text, '-', ''), new_event_id, tier.name, tier.description, tier.price_cents from jsonb_to_recordset(p_ticket_tiers) as tier(name text, description text, price_cents integer);
  return new_event_id;
end; $$;

revoke all on function public.create_event_for_verified_user(text, text, text, text, timestamptz, timestamptz, text, text, double precision, double precision, jsonb) from public, anon, authenticated;
grant execute on function public.create_event_for_verified_user(text, text, text, text, timestamptz, timestamptz, text, text, double precision, double precision, jsonb) to service_role;
