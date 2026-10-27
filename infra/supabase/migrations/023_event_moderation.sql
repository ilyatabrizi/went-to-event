-- Preserve previously published events; every subsequent submission starts pending.
alter table public.events
  add column publication_status text not null default 'approved'
    check (publication_status in ('pending', 'approved', 'rejected')),
  add column review_note text check (char_length(review_note) <= 500),
  add column reviewed_by text,
  add column reviewed_at timestamptz;
alter table public.events alter column publication_status set default 'pending';
create index events_publication_status_idx on public.events(publication_status, starts_at);

-- Restrictive policies also apply when a project has an existing public-read policy.
create policy "Only approved events are public" on public.events as restrictive
  for select to anon, authenticated using (publication_status = 'approved');
create policy "Only approved event tickets are public" on public.ticket_tiers as restrictive
  for select to anon, authenticated using (exists (
    select 1 from public.events e where e.id = event_id and e.publication_status = 'approved'
  ));
create policy "Only approved event venues are public" on public.venues as restrictive
  for select to anon, authenticated using (exists (
    select 1 from public.events e where e.venue_id = venues.id and e.publication_status = 'approved'
  ));

-- Enforce booking eligibility for every insertion, including service-role RPCs.
create function public.require_approved_booking_event() returns trigger
language plpgsql set search_path = public as $$
begin
  perform 1 from public.events where id = new.event_id and publication_status = 'approved' for share;
  if not found then raise exception using errcode = '42501', message = 'Event is not published'; end if;
  return new;
end; $$;
create trigger bookings_require_approved_event before insert on public.bookings
  for each row execute function public.require_approved_booking_event();
revoke all on function public.require_approved_booking_event() from public, anon, authenticated;

-- The API authorizes the reviewer; only the server role may execute these functions.
create function public.review_event(p_event_id text, p_reviewer_id text, p_approved boolean, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.events set publication_status = case when p_approved then 'approved' else 'rejected' end,
    review_note = p_note, reviewed_by = p_reviewer_id, reviewed_at = now()
    where id = p_event_id and publication_status = 'pending';
  if not found then raise exception using errcode = 'P0001', message = 'Event is no longer pending'; end if;
end; $$;
revoke all on function public.review_event(text, text, boolean, text) from public, anon, authenticated;
grant execute on function public.review_event(text, text, boolean, text) to service_role;

create function public.admin_verify_user(p_user_id text, p_reviewer_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  -- Match the lock order used when reviewing a submitted verification request.
  perform 1 from public.account_verification_requests where user_id = p_user_id and status = 'pending' for update;
  update public.profiles set verification_status = 'verified', verified_at = now(), updated_at = now() where id = p_user_id;
  if not found then raise exception using errcode = 'P0002', message = 'User not found'; end if;
  update public.account_verification_requests set status = 'approved', reviewed_by = p_reviewer_id,
    reviewed_at = now(), review_note = 'Verified by an admin'
    where user_id = p_user_id and status = 'pending';
end; $$;
revoke all on function public.admin_verify_user(text, text) from public, anon, authenticated;
grant execute on function public.admin_verify_user(text, text) to service_role;
