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

-- Normalize any legacy duplicate defaults before enforcing one default per page.
with ranked as (
  select layout_id, row_number() over (partition by scope order by published_at desc, layout_id) as position
  from public.visual_studio_publications
  where is_default
)
update public.visual_studio_publications p
set is_default = false
from ranked r
where p.layout_id = r.layout_id and r.position > 1;

with ranked as (
  select id, row_number() over (partition by scope order by updated_at desc, id) as position
  from public.visual_studio_layouts
  where is_default
)
update public.visual_studio_layouts l
set is_default = false
from ranked r
where l.id = r.id and r.position > 1;

drop index if exists public.visual_studio_publications_default_idx;
create unique index visual_studio_publications_one_default_per_scope
  on public.visual_studio_publications(scope)
  where is_default;
