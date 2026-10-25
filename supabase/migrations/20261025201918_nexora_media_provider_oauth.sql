-- Private-by-permission provider OAuth tokens and one-time OAuth state.
-- These tables are service-role only; tokens are never sent to the browser.
create unique index if not exists media_library_owner_platform_external_uidx
  on public.media_library_items(owner_id, platform, external_id);

create table if not exists public.media_provider_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('youtube','tiktok','instagram')),
  provider_user_id text,
  account_name text,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  last_sync_error text,
  unique(owner_id, platform)
);
alter table public.media_provider_connections enable row level security;
revoke all on public.media_provider_connections from anon, authenticated;
grant all on public.media_provider_connections to service_role;

create table if not exists public.media_oauth_states (
  state text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('youtube','tiktok','instagram')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.media_oauth_states enable row level security;
revoke all on public.media_oauth_states from anon, authenticated;
grant all on public.media_oauth_states to service_role;
