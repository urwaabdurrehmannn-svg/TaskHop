-- TaskHop: profile picture storage.
-- Adds a public 'avatars' bucket and owner-scoped write policies. Run once
-- in the Supabase SQL Editor (or via `supabase db push`) after 0002.

-- ---------------------------------------------------------------------------
-- avatars bucket
-- Public read (avatar images are shown wherever a poster/candidate avatar
-- appears across the app, including to signed-out/other users -- consistent
-- with profiles already being publicly readable). Writes are restricted to
-- the owning user via the policies below. Size/type limits are enforced at
-- the bucket level as defense in depth alongside client-side image picking.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Row Level Security on storage.objects, scoped to the 'avatars' bucket.
-- Object paths are always "<user_id>/avatar.jpg", so ownership is checked
-- by matching the first path segment against auth.uid().
-- ---------------------------------------------------------------------------
create policy "avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "users update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "users delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
