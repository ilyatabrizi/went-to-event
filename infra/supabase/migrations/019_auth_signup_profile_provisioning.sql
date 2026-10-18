-- Backfill identity rows for pre-existing Supabase Auth users whose profile IDs
-- already match their Auth UUID. Legacy/custom database IDs are provisioned
-- explicitly during account migration instead.
insert into public.auth_user_identities (auth_user_id, database_user_id, email)
select auth_user.id, auth_user.id::text, auth_user.email
from auth.users auth_user
join public.profiles profile on profile.id = auth_user.id::text
where not exists (
  select 1 from public.auth_user_identities identity
  where identity.auth_user_id = auth_user.id
     or identity.database_user_id = auth_user.id::text
)
on conflict do nothing;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id::text,
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), 80), '')
  )
  on conflict (id) do nothing;

  insert into public.auth_user_identities (auth_user_id, database_user_id, email)
  values (new.id, new.id::text, new.email)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

revoke all on function public.handle_new_auth_user() from public;
