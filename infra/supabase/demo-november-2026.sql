-- Fictional November 2026 demo catalogue. Apply only to the intended demo database.
-- Requires migrations through 023. Additive and safe to run again; existing records are preserved.
-- Public discovery requires the existing verified admin profile as demo owner.
-- Coordinates are illustrative. Attendance starts at zero; these are not real host listings.
begin;

insert into public.venues (id, name, address, latitude, longitude)
values ('20261100-0000-4000-8000-000000000001', 'Aras Warehouse', 'Valiasr St, Tabriz', 38.073, 46.299) on conflict (id) do nothing;
insert into public.events (id, category, title, description, starts_at, ends_at, venue_id, host_name, going_count, publication_status, host_user_id)
values ('demo-nov-2026-1', 'Nightlife', 'AFTERHOURS: The City Is Our Stage', 'An after-dark takeover with underground selectors, immersive lighting, and a courtyard finale. Come for the first beat and stay for the last encore.', '2026-11-06T20:30:00+03:30', '2026-11-07T01:30:00+03:30', '20261100-0000-4000-8000-000000000001', 'Substrata Collective', 0, 'approved', (select id from public.profiles where username = 'admin' and verification_status = 'verified' limit 1)) on conflict (id) do nothing;
insert into public.ticket_tiers (id, event_id, name, description, price_cents)
values ('demo-nov-2026-tier-1', 'demo-nov-2026-1', 'General Admission', 'Full access to the music and courtyard sets', 2500) on conflict (id) do nothing;

insert into public.venues (id, name, address, latitude, longitude)
values ('20261100-0000-4000-8000-000000000002', 'The Assembly Rooftop', 'Shariati St, Tabriz', 38.071, 46.298) on conflict (id) do nothing;
insert into public.events (id, category, title, description, starts_at, ends_at, venue_id, host_name, going_count, publication_status, host_user_id)
values ('demo-nov-2026-2', 'Wellness', 'GOLDEN HOUR SOCIETY: Rise Above the Noise', 'Start above the skyline with a guided rooftop flow, breathwork, and a slow breakfast with new friends. All levels welcome; mats provided.', '2026-11-08T07:30:00+03:30', '2026-11-08T09:30:00+03:30', '20261100-0000-4000-8000-000000000002', 'The Assembly', 0, 'approved', (select id from public.profiles where username = 'admin' and verification_status = 'verified' limit 1)) on conflict (id) do nothing;
insert into public.ticket_tiers (id, event_id, name, description, price_cents)
values ('demo-nov-2026-tier-2', 'demo-nov-2026-2', 'RSVP', 'Rooftop session, mat, and breakfast', 0) on conflict (id) do nothing;

insert into public.venues (id, name, address, latitude, longitude)
values ('20261100-0000-4000-8000-000000000003', 'Meydan Kitchen', 'Meydan St, Tabriz', 38.079, 46.293) on conflict (id) do nothing;
insert into public.events (id, category, title, description, starts_at, ends_at, venue_id, host_name, going_count, publication_status, host_user_id)
values ('demo-nov-2026-3', 'Food', 'THE MAIN CHARACTER TABLE: A Supper Club', 'One long table, five courses, and stories worth staying for. An intimate dinner celebrating local ingredients with a contemporary tasting menu and non-alcoholic pairings.', '2026-11-13T19:30:00+03:30', '2026-11-13T22:30:00+03:30', '20261100-0000-4000-8000-000000000003', 'Meydan Supper Society', 0, 'approved', (select id from public.profiles where username = 'admin' and verification_status = 'verified' limit 1)) on conflict (id) do nothing;
insert into public.ticket_tiers (id, event_id, name, description, price_cents)
values ('demo-nov-2026-tier-3', 'demo-nov-2026-3', 'A Seat at the Table', 'Five courses and non-alcoholic pairings', 6500) on conflict (id) do nothing;

insert into public.venues (id, name, address, latitude, longitude)
values ('20261100-0000-4000-8000-000000000004', 'House of Art', 'Shahnaz St, Tabriz', 38.073, 46.295) on conflict (id) do nothing;
insert into public.events (id, category, title, description, starts_at, ends_at, venue_id, host_name, going_count, publication_status, host_user_id)
values ('demo-nov-2026-4', 'Arts', 'NO SMALL ENTRANCE: Light, Sound & Spectacle', 'Step inside a live collision of projection art, spatial sound, and experimental performance. Explore the installations, meet the artists, and catch the closing live set.', '2026-11-20T18:00:00+03:30', '2026-11-20T22:00:00+03:30', '20261100-0000-4000-8000-000000000004', 'Northwest Art Lab', 0, 'approved', (select id from public.profiles where username = 'admin' and verification_status = 'verified' limit 1)) on conflict (id) do nothing;
insert into public.ticket_tiers (id, event_id, name, description, price_cents)
values ('demo-nov-2026-tier-4', 'demo-nov-2026-4', 'Full Experience', 'All installations and live performances', 1800) on conflict (id) do nothing;

insert into public.venues (id, name, address, latitude, longitude)
values ('20261100-0000-4000-8000-000000000005', 'El Goli Park', 'El Goli Blvd, Tabriz', 38.025, 46.365) on conflict (id) do nothing;
insert into public.events (id, category, title, description, starts_at, ends_at, venue_id, host_name, going_count, publication_status, host_user_id)
values ('demo-nov-2026-5', 'Community', 'THE GRAND LINK-UP: Makers After Dark', 'A night market for the creatively restless. Discover independent makers, street food, live music, and hands-on pop-ups around the park.', '2026-11-27T17:30:00+03:30', '2026-11-27T22:00:00+03:30', '20261100-0000-4000-8000-000000000005', 'Tabriz Makers', 0, 'approved', (select id from public.profiles where username = 'admin' and verification_status = 'verified' limit 1)) on conflict (id) do nothing;
insert into public.ticket_tiers (id, event_id, name, description, price_cents)
values ('demo-nov-2026-tier-5', 'demo-nov-2026-5', 'Market Pass', 'Market entry, live music, and creative pop-ups', 1200) on conflict (id) do nothing;

-- Repair ownership if these specific demo records were seeded before ownership was assigned.
update public.events
set host_user_id = (select id from public.profiles where username = 'admin' and verification_status = 'verified' limit 1)
where id in ('demo-nov-2026-1', 'demo-nov-2026-2', 'demo-nov-2026-3', 'demo-nov-2026-4', 'demo-nov-2026-5')
  and host_user_id is null;

commit;
