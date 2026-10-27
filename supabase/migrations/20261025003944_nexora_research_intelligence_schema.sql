-- JDV NEXORA: research, public-content intelligence, learning and creation foundation.
-- Idempotent migration. Private user work remains protected by owner-scoped RLS.
create extension if not exists pgcrypto;

create table if not exists public.nexora_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  plan text not null default 'free' check (plan in ('free','premium','admin')),
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entrepreneurs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  summary text,
  biography text,
  country text,
  industry text,
  website_url text,
  avatar_url text,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','reviewed','verified')),
  visibility text not null default 'public' check (visibility in ('public','private')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_sources (
  id uuid primary key default gen_random_uuid(),
  entrepreneur_id uuid references public.entrepreneurs(id) on delete cascade,
  title text not null,
  source_url text not null,
  source_type text not null default 'article' check (source_type in ('website','youtube','social','article','podcast','book','other')),
  publisher text,
  published_at timestamptz,
  checked_at timestamptz,
  excerpt text,
  credibility_note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(source_url)
);

create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  entrepreneur_id uuid not null references public.entrepreneurs(id) on delete cascade,
  platform text not null check (platform in ('youtube','instagram','tiktok','linkedin','facebook','x','website','other')),
  handle text,
  profile_url text not null,
  is_official boolean not null default false,
  created_at timestamptz not null default now(),
  unique(platform, profile_url)
);

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  entrepreneur_id uuid references public.entrepreneurs(id) on delete set null,
  source_id uuid references public.content_sources(id) on delete set null,
  platform text not null default 'other',
  external_id text,
  title text not null,
  canonical_url text not null,
  description text,
  published_at timestamptz,
  content_type text not null default 'post' check (content_type in ('video','post','article','podcast','interview','book','other')),
  language text,
  public_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(canonical_url)
);

create table if not exists public.content_analyses (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  analysis_type text not null default 'summary' check (analysis_type in ('summary','strategy','business_model','lessons','action_plan','transcript_notes')),
  status text not null default 'draft' check (status in ('draft','processing','completed','failed')),
  summary text,
  key_insights jsonb not null default '[]'::jsonb,
  strategies jsonb not null default '[]'::jsonb,
  action_steps jsonb not null default '[]'::jsonb,
  model_label text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  entrepreneur_id uuid not null references public.entrepreneurs(id) on delete cascade,
  event_date date,
  title text not null,
  description text,
  category text not null default 'milestone',
  source_id uuid references public.content_sources(id) on delete set null,
  confidence text not null default 'unverified' check (confidence in ('unverified','source_supported','multiple_sources')),
  created_at timestamptz not null default now()
);

create table if not exists public.followed_entrepreneurs (
  user_id uuid not null references auth.users(id) on delete cascade,
  entrepreneur_id uuid not null references public.entrepreneurs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id, entrepreneur_id)
);

create table if not exists public.user_learning_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_item_id uuid references public.content_items(id) on delete cascade,
  entrepreneur_id uuid references public.entrepreneurs(id) on delete cascade,
  item_type text not null default 'favorite' check (item_type in ('favorite','note','bookmark','goal')),
  note text,
  progress integer not null default 0 check (progress between 0 and 100),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (content_item_id is not null or entrepreneur_id is not null)
);

create table if not exists public.nexora_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  notification_type text not null default 'info',
  target_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.sync_jobs (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  target_url text,
  status text not null default 'queued' check (status in ('queued','running','completed','failed','cancelled')),
  progress integer not null default 0 check (progress between 0 and 100),
  result_summary text,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists entrepreneurs_name_idx on public.entrepreneurs using gin (to_tsvector('simple', name || ' ' || coalesce(summary,'')));
create index if not exists entrepreneurs_country_industry_idx on public.entrepreneurs(country, industry);
create index if not exists content_items_entrepreneur_published_idx on public.content_items(entrepreneur_id, published_at desc);
create index if not exists timeline_events_date_idx on public.timeline_events(entrepreneur_id, event_date);
create index if not exists content_analyses_content_idx on public.content_analyses(content_item_id, created_at desc);
create index if not exists notifications_user_unread_idx on public.nexora_notifications(user_id, created_at desc) where read_at is null;
create index if not exists sync_jobs_owner_status_idx on public.sync_jobs(requested_by, status, created_at desc);
create index if not exists learning_items_owner_idx on public.user_learning_items(user_id, created_at desc);

alter table public.nexora_profiles enable row level security;
alter table public.entrepreneurs enable row level security;
alter table public.content_sources enable row level security;
alter table public.social_accounts enable row level security;
alter table public.content_items enable row level security;
alter table public.content_analyses enable row level security;
alter table public.timeline_events enable row level security;
alter table public.followed_entrepreneurs enable row level security;
alter table public.user_learning_items enable row level security;
alter table public.nexora_notifications enable row level security;
alter table public.sync_jobs enable row level security;

drop policy if exists nexora_profiles_read_own on public.nexora_profiles;
create policy nexora_profiles_read_own on public.nexora_profiles for select to authenticated using (id = (select auth.uid()));
drop policy if exists nexora_profiles_insert_own on public.nexora_profiles;
create policy nexora_profiles_insert_own on public.nexora_profiles for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists nexora_profiles_update_own on public.nexora_profiles;
create policy nexora_profiles_update_own on public.nexora_profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists entrepreneurs_read_public on public.entrepreneurs;
create policy entrepreneurs_read_public on public.entrepreneurs for select to authenticated using (visibility = 'public' or created_by = (select auth.uid()));
drop policy if exists entrepreneurs_insert_authenticated on public.entrepreneurs;
create policy entrepreneurs_insert_authenticated on public.entrepreneurs for insert to authenticated with check (created_by = (select auth.uid()));
drop policy if exists entrepreneurs_update_creator on public.entrepreneurs;
create policy entrepreneurs_update_creator on public.entrepreneurs for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
drop policy if exists entrepreneurs_delete_creator on public.entrepreneurs;
create policy entrepreneurs_delete_creator on public.entrepreneurs for delete to authenticated using (created_by = (select auth.uid()));

drop policy if exists content_sources_read_authenticated on public.content_sources;
create policy content_sources_read_authenticated on public.content_sources for select to authenticated using (exists (select 1 from public.entrepreneurs e where e.id = entrepreneur_id and (e.visibility = 'public' or e.created_by = (select auth.uid()))));
drop policy if exists content_sources_insert_creator on public.content_sources;
create policy content_sources_insert_creator on public.content_sources for insert to authenticated with check (created_by = (select auth.uid()));
drop policy if exists content_sources_update_creator on public.content_sources;
create policy content_sources_update_creator on public.content_sources for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
drop policy if exists content_sources_delete_creator on public.content_sources;
create policy content_sources_delete_creator on public.content_sources for delete to authenticated using (created_by = (select auth.uid()));

drop policy if exists social_accounts_read_public on public.social_accounts;
create policy social_accounts_read_public on public.social_accounts for select to authenticated using (exists (select 1 from public.entrepreneurs e where e.id = entrepreneur_id and (e.visibility = 'public' or e.created_by = (select auth.uid()))));
drop policy if exists social_accounts_manage_creator on public.social_accounts;
create policy social_accounts_manage_creator on public.social_accounts for all to authenticated using (exists (select 1 from public.entrepreneurs e where e.id = entrepreneur_id and e.created_by = (select auth.uid())) ) with check (exists (select 1 from public.entrepreneurs e where e.id = entrepreneur_id and e.created_by = (select auth.uid())));

drop policy if exists content_items_read_public on public.content_items;
create policy content_items_read_public on public.content_items for select to authenticated using (entrepreneur_id is null or exists (select 1 from public.entrepreneurs e where e.id = entrepreneur_id and (e.visibility = 'public' or e.created_by = (select auth.uid()))));
drop policy if exists content_items_manage_creator on public.content_items;
create policy content_items_manage_creator on public.content_items for all to authenticated using (exists (select 1 from public.entrepreneurs e where e.id = entrepreneur_id and e.created_by = (select auth.uid())) ) with check (exists (select 1 from public.entrepreneurs e where e.id = entrepreneur_id and e.created_by = (select auth.uid())));

drop policy if exists analyses_read_authenticated on public.content_analyses;
create policy analyses_read_authenticated on public.content_analyses for select to authenticated using (exists (select 1 from public.content_items c left join public.entrepreneurs e on e.id = c.entrepreneur_id where c.id = content_item_id and (e.visibility = 'public' or e.created_by = (select auth.uid()))));
drop policy if exists analyses_manage_creator on public.content_analyses;
create policy analyses_manage_creator on public.content_analyses for all to authenticated using (exists (select 1 from public.content_items c join public.entrepreneurs e on e.id = c.entrepreneur_id where c.id = content_item_id and e.created_by = (select auth.uid())) ) with check (exists (select 1 from public.content_items c join public.entrepreneurs e on e.id = c.entrepreneur_id where c.id = content_item_id and e.created_by = (select auth.uid())));

drop policy if exists timeline_read_public on public.timeline_events;
create policy timeline_read_public on public.timeline_events for select to authenticated using (exists (select 1 from public.entrepreneurs e where e.id = entrepreneur_id and (e.visibility = 'public' or e.created_by = (select auth.uid()))));
drop policy if exists timeline_manage_creator on public.timeline_events;
create policy timeline_manage_creator on public.timeline_events for all to authenticated using (exists (select 1 from public.entrepreneurs e where e.id = entrepreneur_id and e.created_by = (select auth.uid())) ) with check (exists (select 1 from public.entrepreneurs e where e.id = entrepreneur_id and e.created_by = (select auth.uid())));

drop policy if exists follows_read_own on public.followed_entrepreneurs;
create policy follows_read_own on public.followed_entrepreneurs for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists follows_insert_own on public.followed_entrepreneurs;
create policy follows_insert_own on public.followed_entrepreneurs for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists follows_delete_own on public.followed_entrepreneurs;
create policy follows_delete_own on public.followed_entrepreneurs for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists learning_items_all_own on public.user_learning_items;
create policy learning_items_all_own on public.user_learning_items for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists notifications_all_own on public.nexora_notifications;
create policy notifications_all_own on public.nexora_notifications for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists sync_jobs_read_own on public.sync_jobs;
create policy sync_jobs_read_own on public.sync_jobs for select to authenticated using (requested_by = (select auth.uid()));
drop policy if exists sync_jobs_insert_own on public.sync_jobs;
create policy sync_jobs_insert_own on public.sync_jobs for insert to authenticated with check (requested_by = (select auth.uid()));

-- Keep updated_at current for profiles and entrepreneur records.
create or replace function public.nexora_set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists nexora_profiles_updated_at on public.nexora_profiles;
create trigger nexora_profiles_updated_at before update on public.nexora_profiles for each row execute function public.nexora_set_updated_at();
drop trigger if exists entrepreneurs_updated_at on public.entrepreneurs;
create trigger entrepreneurs_updated_at before update on public.entrepreneurs for each row execute function public.nexora_set_updated_at();
