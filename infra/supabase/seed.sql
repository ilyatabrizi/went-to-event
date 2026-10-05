insert into public.venues (id, name, address)
values
  ('00000000-0000-0000-0000-000000000001', 'Aras Warehouse', 'Valiasr St, Tabriz'),
  ('00000000-0000-0000-0000-000000000002', 'The Assembly Rooftop', 'Shariati St, Tabriz'),
  ('00000000-0000-0000-0000-000000000003', 'Meydan Kitchen', 'Meydan St, Tabriz'),
  ('00000000-0000-0000-0000-000000000004', 'House of Art', 'Shahnaz St, Tabriz'),
  ('00000000-0000-0000-0000-000000000005', 'El Goli Park', 'El Goli Blvd, Tabriz')
on conflict (id) do update set
  name = excluded.name,
  address = excluded.address;

insert into public.events (
  id, category, title, description, starts_at, ends_at, venue_id, host_name, going_count
)
values
  (
    'event-1', 'Nightlife', 'Warehouse Sessions: Autumn Opening',
    'House and techno in a raw industrial space, with local selectors and a late-night courtyard set.',
    '2026-10-03T20:30:00+03:30', '2026-10-04T01:30:00+03:30',
    '00000000-0000-0000-0000-000000000001', 'Substrata Collective', 86
  ),
  (
    'event-2', 'Wellness', 'Sunrise Rooftop Yoga',
    'A slow vinyasa flow above the city. All levels are welcome and mats are provided.',
    '2026-10-07T07:30:00+03:30', '2026-10-07T08:45:00+03:30',
    '00000000-0000-0000-0000-000000000002', 'The Assembly', 31
  ),
  (
    'event-3', 'Food', 'Third Culture Supper Club',
    'A five-course communal dinner tracing one chef’s family recipes across three generations.',
    '2026-10-12T19:30:00+03:30', '2026-10-12T22:30:00+03:30',
    '00000000-0000-0000-0000-000000000003', 'Mira Okafor', 24
  ),
  (
    'event-4', 'Arts', 'Light / Sound Installation Night',
    'An immersive evening of projected light, ambient sound, and experimental performance.',
    '2026-10-20T18:00:00+03:30', '2026-10-20T21:30:00+03:30',
    '00000000-0000-0000-0000-000000000004', 'Northwest Art Lab', 57
  ),
  (
    'event-5', 'Community', 'Autumn Night Market',
    'A relaxed evening market with makers, small plates, live music, and a late October sky.',
    '2026-10-29T18:30:00+03:30', '2026-10-29T22:00:00+03:30',
    '00000000-0000-0000-0000-000000000005', 'Tabriz Makers', 112
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
  ('tier-1', 'event-1', 'General Admission', 'Entry after 8:30 PM', 2500),
  ('tier-2', 'event-1', 'Early + Drink', 'Entry plus one welcome drink', 3800),
  ('tier-3', 'event-2', 'RSVP', 'Free entry; mats provided', 0),
  ('tier-4', 'event-3', 'Communal Seat', 'Five courses with a non-alcoholic pairing', 6500),
  ('tier-5', 'event-4', 'General Entry', 'Access to the full installation', 1800),
  ('tier-6', 'event-5', 'Entry', 'Market entry and live music', 1200)
on conflict (id) do update set
  event_id = excluded.event_id,
  name = excluded.name,
  description = excluded.description,
  price_cents = excluded.price_cents;
