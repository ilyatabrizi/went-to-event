-- Preserve the profile details collected at sign-up when provisioning Auth users.
-- Keep usernames constrained to the format accepted by the website and avoid
-- overwriting profile data a user has already saved.
with metadata_profiles as (
  select
    identity.database_user_id,
    case
      when lower(trim(coalesce(auth_user.raw_user_meta_data ->> 'username', ''))) ~ '^[a-z0-9_]{3,24}$'
        then lower(trim(auth_user.raw_user_meta_data ->> 'username'))
      else null
    end as username,
    nullif(left(trim(coalesce(auth_user.raw_user_meta_data ->> 'full_name', auth_user.raw_user_meta_data ->> 'name', '')), 80), '') as display_name,
    case
      when coalesce(auth_user.raw_user_meta_data ->> 'avatar_url', auth_user.raw_user_meta_data ->> 'picture', '') ~* '^https?://'
       and length(coalesce(auth_user.raw_user_meta_data ->> 'avatar_url', auth_user.raw_user_meta_data ->> 'picture', '')) <= 500
        then coalesce(auth_user.raw_user_meta_data ->> 'avatar_url', auth_user.raw_user_meta_data ->> 'picture')
      else null
    end as avatar_url,
    row_number() over (
      partition by lower(trim(coalesce(auth_user.raw_user_meta_data ->> 'username', '')))
      order by auth_user.created_at, auth_user.id
    ) as username_rank
  from auth.users auth_user
  join public.auth_user_identities identity on identity.auth_user_id = auth_user.id
)
update public.profiles profile
set username = case
      when profile.username is null
       and metadata.username is not null
       and metadata.username_rank = 1
       and not exists (
         select 1 from public.profiles other_profile
         where lower(other_profile.username) = metadata.username
           and other_profile.id <> profile.id
       )
        then metadata.username
      else profile.username
    end,
    display_name = coalesce(profile.display_name, metadata.display_name),
    avatar_url = coalesce(profile.avatar_url, metadata.avatar_url),
    updated_at = now()
from metadata_profiles metadata
where profile.id = metadata.database_user_id;

-- Put any legacy profile ID mapping in trusted app metadata so API requests can
-- resolve the established profile ID from the locally verified JWT claims.
update auth.users auth_user
set raw_app_meta_data = coalesce(auth_user.raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('database_user_id', identity.database_user_id)
from public.auth_user_identities identity
where identity.auth_user_id = auth_user.id
  and auth_user.raw_app_meta_data ->> 'database_user_id' is distinct from identity.database_user_id;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_username text;
  profile_display_name text;
  profile_avatar_url text;
begin
  profile_username := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  if profile_username !~ '^[a-z0-9_]{3,24}$'
     or exists (select 1 from public.profiles profile where lower(profile.username) = profile_username and profile.id <> new.id::text) then
    profile_username := null;
  end if;

  profile_display_name := nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), 80), '');
  profile_avatar_url := case
    when coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', '') ~* '^https?://'
     and length(coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', '')) <= 500
      then coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
    else null
  end;

  begin
    insert into public.profiles as existing_profile (id, username, display_name, avatar_url)
    values (new.id::text, profile_username, profile_display_name, profile_avatar_url)
    on conflict (id) do update set
      username = coalesce(existing_profile.username, excluded.username),
      display_name = coalesce(existing_profile.display_name, excluded.display_name),
      avatar_url = coalesce(existing_profile.avatar_url, excluded.avatar_url),
      updated_at = now();
  exception when unique_violation then
    -- A concurrent sign-up may claim the same username after the check above.
    insert into public.profiles as existing_profile (id, display_name, avatar_url)
    values (new.id::text, profile_display_name, profile_avatar_url)
    on conflict (id) do update set
      display_name = coalesce(existing_profile.display_name, excluded.display_name),
      avatar_url = coalesce(existing_profile.avatar_url, excluded.avatar_url),
      updated_at = now();
  end;

  insert into public.auth_user_identities (auth_user_id, database_user_id, email)
  values (new.id, new.id::text, new.email)
  on conflict do nothing;

  update auth.users auth_user
  set raw_app_meta_data = coalesce(auth_user.raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('database_user_id', new.id::text)
  where auth_user.id = new.id
    and auth_user.raw_app_meta_data ->> 'database_user_id' is distinct from new.id::text;

  return new;
end;
$$;
