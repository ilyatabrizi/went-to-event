alter table public.profiles
  add column if not exists verification_status text not null default 'unverified'
  check (verification_status in ('unverified', 'pending', 'verified', 'rejected', 'suspended'));

alter table public.profiles
  add column if not exists verified_at timestamptz;

create table if not exists public.account_verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  message text not null check (char_length(message) between 20 and 1000),
  reference_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists account_verification_one_pending_per_user_idx
  on public.account_verification_requests (user_id)
  where status = 'pending';

create index if not exists account_verification_pending_created_idx
  on public.account_verification_requests (created_at)
  where status = 'pending';

alter table public.account_verification_requests enable row level security;
revoke all on public.account_verification_requests from anon, authenticated;
grant all on public.account_verification_requests to service_role;

create or replace function public.submit_account_verification(
  p_user_id text,
  p_message text,
  p_reference_url text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_status text;
  request_id uuid;
begin
  select verification_status into current_status
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'Profile not found';
  end if;
  if current_status = 'verified' then
    raise exception using errcode = 'P0001', message = 'Account is already verified';
  end if;
  if current_status = 'pending' then
    raise exception using errcode = 'P0001', message = 'Request is already pending';
  end if;
  if current_status = 'suspended' then
    raise exception using errcode = '42501', message = 'Account is suspended';
  end if;

  insert into public.account_verification_requests (user_id, message, reference_url)
  values (p_user_id, p_message, p_reference_url)
  returning id into request_id;

  update public.profiles
  set verification_status = 'pending', updated_at = now()
  where id = p_user_id;

  return request_id;
end;
$$;

create or replace function public.review_account_verification(
  p_request_id uuid,
  p_reviewer_id text,
  p_approved boolean,
  p_review_note text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id text;
  next_status text;
begin
  select user_id into target_user_id
  from public.account_verification_requests
  where id = p_request_id and status = 'pending'
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'Request is no longer pending';
  end if;

  next_status := case when p_approved then 'approved' else 'rejected' end;
  update public.account_verification_requests
  set status = next_status,
      review_note = p_review_note,
      reviewed_by = p_reviewer_id,
      reviewed_at = now()
  where id = p_request_id;

  update public.profiles
  set verification_status = case when p_approved then 'verified' else 'rejected' end,
      verified_at = case when p_approved then now() else null end,
      updated_at = now()
  where id = target_user_id;
end;
$$;

revoke all on function public.submit_account_verification(text, text, text) from public, anon, authenticated;
grant execute on function public.submit_account_verification(text, text, text) to service_role;
revoke all on function public.review_account_verification(uuid, text, boolean, text) from public, anon, authenticated;
grant execute on function public.review_account_verification(uuid, text, boolean, text) to service_role;
