-- Publishable configurations are separated from drafts so regular users never read draft JSON.
create table if not exists public.visual_studio_publications (
  layout_id uuid primary key references public.visual_studio_layouts(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  config jsonb not null check (jsonb_typeof(config) = 'object' and octet_length(config::text) <= 200000),
  is_default boolean not null default false,
  published_by uuid not null references auth.users(id) on delete restrict,
  published_at timestamptz not null default now()
);
create index if not exists visual_studio_publications_default_idx on public.visual_studio_publications(is_default) where is_default;
alter table public.visual_studio_publications enable row level security;
drop policy if exists visual_studio_publications_read_published on public.visual_studio_publications;
create policy visual_studio_publications_read_published on public.visual_studio_publications for select to authenticated using (true);
drop policy if exists visual_studio_publications_admin_write on public.visual_studio_publications;
create policy visual_studio_publications_admin_write on public.visual_studio_publications for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
grant select on public.visual_studio_publications to authenticated;
grant insert, update, delete on public.visual_studio_publications to authenticated;
