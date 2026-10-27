-- Visual design studio: admin-only serialized layouts and immutable snapshots.
create table if not exists public.visual_studio_layouts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  scope text not null default 'dashboard' check (scope in ('dashboard')),
  draft_config jsonb not null default '{"schemaVersion":1,"theme":"nexora-dark","components":[]}'::jsonb,
  published_config jsonb,
  version integer not null default 1 check (version > 0),
  is_default boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint visual_studio_draft_object check (jsonb_typeof(draft_config) = 'object'),
  constraint visual_studio_published_object check (published_config is null or jsonb_typeof(published_config) = 'object'),
  constraint visual_studio_draft_size check (octet_length(draft_config::text) <= 200000),
  constraint visual_studio_published_size check (published_config is null or octet_length(published_config::text) <= 200000)
);

create table if not exists public.visual_studio_versions (
  id uuid primary key default gen_random_uuid(),
  layout_id uuid not null references public.visual_studio_layouts(id) on delete cascade,
  version integer not null check (version > 0),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object' and octet_length(snapshot::text) <= 200000),
  action text not null check (action in ('draft_saved','published','restored')),
  actor_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (layout_id, version)
);

create index if not exists visual_studio_layouts_updated_at_idx on public.visual_studio_layouts(updated_at desc);
create index if not exists visual_studio_versions_layout_created_idx on public.visual_studio_versions(layout_id, created_at desc);

alter table public.visual_studio_layouts enable row level security;
alter table public.visual_studio_versions enable row level security;

drop policy if exists visual_studio_layouts_admin_all on public.visual_studio_layouts;
create policy visual_studio_layouts_admin_all on public.visual_studio_layouts
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists visual_studio_versions_admin_all on public.visual_studio_versions;
create policy visual_studio_versions_admin_all on public.visual_studio_versions
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

grant select, insert, update, delete on public.visual_studio_layouts to authenticated;
grant select, insert, update, delete on public.visual_studio_versions to authenticated;
