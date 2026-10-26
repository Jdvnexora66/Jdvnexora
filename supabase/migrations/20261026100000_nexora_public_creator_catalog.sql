-- Public creator directory for user-managed YouTube channels.
-- Imported videos remain references/embeds to YouTube; no video files are copied.
create table if not exists public.nexora_creator_channels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  platform text not null default 'youtube' check (platform = 'youtube'),
  channel_id text not null check (channel_id ~ '^UC[a-zA-Z0-9_-]{22}$'),
  channel_url text not null check (channel_url ~ '^https://www\.youtube\.com/channel/UC'),
  channel_name text,
  last_synced_at timestamptz,
  last_sync_error text,
  created_at timestamptz not null default now(),
  unique (owner_id, channel_id)
);
create index if not exists nexora_creator_channels_owner_idx
  on public.nexora_creator_channels(owner_id, created_at desc);
alter table public.nexora_creator_channels enable row level security;
drop policy if exists nexora_creator_channels_select_own on public.nexora_creator_channels;
create policy nexora_creator_channels_select_own on public.nexora_creator_channels
  for select to authenticated using ((select auth.uid()) = owner_id);
-- Mutations run through the authenticated Edge Function using the service role.
revoke insert, update, delete on public.nexora_creator_channels from anon, authenticated;
grant select on public.nexora_creator_channels to authenticated;
