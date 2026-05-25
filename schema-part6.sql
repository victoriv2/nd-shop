-- SQL Schema Part 6: Storage Buckets

-- 1. Create a public bucket for media uploads (images, voice notes, documents)
insert into storage.buckets (id, name, public) 
values ('media', 'media', true) 
on conflict (id) do nothing;


-- 3. Allow public read access to the media bucket
create policy "Anyone can view media"
on storage.objects for select
using ( bucket_id = 'media' );

-- 4. Allow authenticated users to upload files to the media bucket
create policy "Authenticated users can upload media"
on storage.objects for insert
with check ( bucket_id = 'media' and auth.role() = 'authenticated' );
