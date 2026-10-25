-- Private bucket for media files uploaded by owners or licensed contributors.
alter table public.media_library_items add column if not exists storage_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('nexora-media','nexora-media',false,524288000,array['video/mp4','video/webm','video/quicktime','audio/mpeg','audio/mp4','audio/ogg','audio/wav','audio/webm'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists nexora_media_read_owner_or_public on storage.objects;
create policy nexora_media_read_owner_or_public on storage.objects for select to authenticated
using (bucket_id='nexora-media' and ((storage.foldername(name))[1]=(select auth.uid())::text or exists (select 1 from public.media_library_items m where m.storage_path=name and m.visibility='public')));

drop policy if exists nexora_media_upload_owner_folder on storage.objects;
create policy nexora_media_upload_owner_folder on storage.objects for insert to authenticated
with check (bucket_id='nexora-media' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists nexora_media_update_owner_folder on storage.objects;
create policy nexora_media_update_owner_folder on storage.objects for update to authenticated
using (bucket_id='nexora-media' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check (bucket_id='nexora-media' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists nexora_media_delete_owner_folder on storage.objects;
create policy nexora_media_delete_owner_folder on storage.objects for delete to authenticated
using (bucket_id='nexora-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
