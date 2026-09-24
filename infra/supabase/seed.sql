insert into public.venues (id, name, address)
values
  ('00000000-0000-0000-0000-000000000001', 'Pier 70', '420 22nd St, Dogpatch, San Francisco'),
  ('00000000-0000-0000-0000-000000000002', 'The Assembly Rooftop', '150 Valencia St, San Francisco'),
  ('00000000-0000-0000-0000-000000000003', 'Mission Kitchen', '2820 Mission St, San Francisco')
on conflict (id) do update set
  name = excluded.name,
  address = excluded.address;

insert into public.events (
  id, category, title, description, starts_at, ends_at, venue_id, host_name, going_count
)
values
  (
    'event-1', 'Nightlife', 'Warehouse Sessions Vol. 9',
    'Four rooms, one raw industrial shell on the waterfront. House and techno until sunrise.',
    '2026-09-25T21:00:00-07:00', '2026-09-26T03:00:00-07:00',
    '00000000-0000-0000-0000-000000000001', 'Substrata Collective', 214
  ),
  (
    'event-2', 'Wellness', 'Sunrise Rooftop Yoga',
    'Start the weekend above the fog with a slow vinyasa flow. All levels welcome.',
    '2026-09-26T07:00:00-07:00', '2026-09-26T08:15:00-07:00',
    '00000000-0000-0000-0000-000000000002', 'The Assembly', 42
  ),
  (
    'event-3', 'Food', 'Third Culture Supper Club',
    'A five-course communal dinner tracing one chef’s diasporic memory across three continents.',
    '2026-09-26T19:30:00-07:00', '2026-09-26T22:30:00-07:00',
    '00000000-0000-0000-0000-000000000003', 'Mira Okafor', 28
  )
on conflict (id) do update set
  category = excluded.category,
  title = excluded.title,
  description = excluded.description,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  venue_id = excluded.venue_id,
  host_name = excluded.host_name,
  going_count = excluded.going_count;

insert into public.ticket_tiers (id, event_id, name, description, price_cents)
values
  ('tier-1', 'event-1', 'General Admission', 'Entry after 9 PM', 2500),
  ('tier-2', 'event-1', 'Early + Drink', 'Entry plus house cocktail', 3800),
  ('tier-3', 'event-2', 'RSVP', 'Free entry; mats provided', 0),
  ('tier-4', 'event-3', 'Communal Seat', 'Five courses plus wine pairing', 6500)
on conflict (id) do update set
  event_id = excluded.event_id,
  name = excluded.name,
  description = excluded.description,
  price_cents = excluded.price_cents;
