-- Persistent NEXORA media library and owner-scoped sync job tracking.
-- Provider tokens are intentionally not stored in public tables.
create table if not exists public.media_library_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  entrepreneur_id uuid references public.entrepreneurs(id) on delete set null,
  title text not null check (length(trim(title)) between 1 and 240),
  creator_name text,
  platform text not null check (platform in ('youtube','tiktok','instagram','spotify','soundcloud','other')),
  external_id text,
  source_url text not null check (source_url ~ '^https://'),
  embed_url text not null check (embed_url ~ '^https://'),
  thumbnail_url text check (thumbnail_url is null or thumbnail_url ~ '^https://'),
  description text,
  content_type text not null default 'video' check (content_type in ('video','podcast','interview','audio','short','other')),
  published_at timestamptz,
  visibility text not null default 'private' check (visibility in ('private','public')),
  sync_source text not null default 'manual' check (sync_source in ('manual','youtube_api','tiktok_api','instagram_api','spotify_api','soundcloud_api','authorized_import')),
  provider_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists media_library_public_feed_idx
  on public.media_library_items (published_at desc nulls last, created_at desc)
  where visibility = 'public';
create index if not exists media_library_owner_created_idx
  on public.media_library_items (owner_id, created_at desc);
create index if not exists media_library_platform_external_idx
  on public.media_library_items (platform, external_id) where external_id is not null;
create index if not exists media_library_creator_search_idx
  on public.media_library_items using gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(creator_name,'') || ' ' || coalesce(description,'')));

alter table public.media_library_items enable row level security;
drop policy if exists media_library_read_public_or_own on public.media_library_items;
create policy media_library_read_public_or_own on public.media_library_items
  for select to authenticated using (visibility = 'public' or owner_id = (select auth.uid()));
drop policy if exists media_library_insert_own on public.media_library_items;
create policy media_library_insert_own on public.media_library_items
  for insert to authenticated with check (owner_id = (select auth.uid()));
drop policy if exists media_library_update_own on public.media_library_items;
create policy media_library_update_own on public.media_library_items
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists media_library_delete_own on public.media_library_items;
create policy media_library_delete_own on public.media_library_items
  for delete to authenticated using (owner_id = (select auth.uid()));
drop trigger if exists media_library_items_updated_at on public.media_library_items;
create trigger media_library_items_updated_at before update on public.media_library_items
  for each row execute function public.nexora_set_updated_at();

create table if not exists public.media_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('youtube','tiktok','instagram','spotify','soundcloud')),
  creator_handle text not null check (length(trim(creator_handle)) between 1 and 240),
  status text not null default 'queued' check (status in ('queued','running','completed','failed','cancelled')),
  discovered_count integer not null default 0 check (discovered_count >= 0),
  imported_count integer not null default 0 check (imported_count >= 0),
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists media_sync_jobs_owner_created_idx on public.media_sync_jobs (owner_id, created_at desc);
alter table public.media_sync_jobs enable row level security;
drop policy if exists media_sync_jobs_read_own on public.media_sync_jobs;
create policy media_sync_jobs_read_own on public.media_sync_jobs
  for select to authenticated using (owner_id = (select auth.uid()));
drop policy if exists media_sync_jobs_insert_own on public.media_sync_jobs;
create policy media_sync_jobs_insert_own on public.media_sync_jobs
  for insert to authenticated with check (owner_id = (select auth.uid()));
