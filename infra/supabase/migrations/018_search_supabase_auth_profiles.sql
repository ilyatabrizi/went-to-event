create or replace function public.search_profiles(
  p_user_id text,
  p_query text,
  p_limit integer default 20
)
returns table (
  id text,
  username text,
  display_name text,
  avatar_url text
)
language sql
security definer
set search_path = public
as $$
  with input as (
    select lower(trim(p_query)) as term
  )
  select
    profile.id,
    profile.username,
    profile.display_name,
    profile.avatar_url
  from public.profiles profile
  cross join input
  where profile.id <> p_user_id
    and (
      exists (
        select 1
        from auth.users auth_user
        where auth_user.id::text = profile.id
      )
      or exists (
        select 1
        from public.auth_user_identities identity
        where identity.database_user_id = profile.id
      )
      or exists (
        select 1
        from public.user_identities legacy_identity
        where legacy_identity.database_user_id = profile.id
      )
    )
    and (
      lower(coalesce(profile.username, '')) like '%' || input.term || '%'
      or lower(coalesce(profile.display_name, '')) like '%' || input.term || '%'
    )
  order by
    greatest(
      similarity(lower(coalesce(profile.username, '')), input.term),
      similarity(lower(coalesce(profile.display_name, '')), input.term)
    ) desc,
    profile.display_name asc nulls last,
    profile.id
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

revoke execute on function public.search_profiles(text, text, integer) from public;
grant execute on function public.search_profiles(text, text, integer) to service_role;
