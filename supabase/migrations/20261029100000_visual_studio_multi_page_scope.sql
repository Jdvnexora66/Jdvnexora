-- Enable independent visual layouts per application page while keeping the existing admin-only editor.
alter table public.visual_studio_layouts
  drop constraint if exists visual_studio_layouts_scope_check;

alter table public.visual_studio_layouts
  add constraint visual_studio_layouts_scope_check
  check (scope in ('dashboard','studio','projects','organization','academy','resources','discover','media','timeline','insights','library','roadmap','billing','administration','custom'));

alter table public.visual_studio_publications
  add column if not exists scope text not null default 'dashboard';

update public.visual_studio_publications p
set scope = l.scope
from public.visual_studio_layouts l
where l.id = p.layout_id;

alter table public.visual_studio_publications
  drop constraint if exists visual_studio_publications_scope_check;

alter table public.visual_studio_publications
  add constraint visual_studio_publications_scope_check
  check (scope in ('dashboard','studio','projects','organization','academy','resources','discover','media','timeline','insights','library','roadmap','billing','administration','custom'));

drop index if exists public.visual_studio_publications_default_idx;
create unique index visual_studio_publications_one_default_per_scope
  on public.visual_studio_publications(scope)
  where is_default;
