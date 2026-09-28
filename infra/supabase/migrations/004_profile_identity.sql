alter table public.profiles
  add column if not exists username text;

alter table public.profiles
  drop constraint if exists profiles_username_format;

alter table public.profiles
  add constraint profiles_username_format
  check (username is null or username ~ '^[a-z0-9_]{3,24}$');

create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username))
  where username is not null;

insert into storage.buckets (id, name, public)
values ('profile-pictures', 'profile-pictures', true)
on conflict (id) do update set public = true;

create policy "Users can upload their own profile picture"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-pictures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own profile picture"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile-pictures'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-pictures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own profile picture"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-pictures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
