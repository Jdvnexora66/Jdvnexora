-- JDV NEXORA: allow authenticated owners to create basic projects and save project content.
-- RLS remains enabled; ownership is required for every write.

drop policy if exists projects_insert_owner_with_access on public.studio_projects;
drop policy if exists projects_insert_owner_basic_free on public.studio_projects;
create policy projects_insert_owner_basic_free
on public.studio_projects
for insert to authenticated
with check (owner_id = (select auth.uid()));

drop policy if exists projects_update_owner_with_access on public.studio_projects;
drop policy if exists projects_update_owner_basic_free on public.studio_projects;
create policy projects_update_owner_basic_free
on public.studio_projects
for update to authenticated
using ((owner_id = (select auth.uid())) or private.is_admin())
with check ((owner_id = (select auth.uid())) or private.is_admin());

drop policy if exists assets_insert_owner_with_access on public.studio_assets;
drop policy if exists assets_insert_owner_project on public.studio_assets;
create policy assets_insert_owner_project
on public.studio_assets
for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.studio_projects p
    where p.id = studio_assets.project_id
      and p.owner_id = (select auth.uid())
  )
);

drop policy if exists assets_update_owner_with_access on public.studio_assets;
drop policy if exists assets_update_owner_project on public.studio_assets;
create policy assets_update_owner_project
on public.studio_assets
for update to authenticated
using (
  (owner_id = (select auth.uid()) and exists (
    select 1 from public.studio_projects p
    where p.id = studio_assets.project_id
      and p.owner_id = (select auth.uid())
  )) or private.is_admin()
)
with check (
  (owner_id = (select auth.uid()) and exists (
    select 1 from public.studio_projects p
    where p.id = studio_assets.project_id
      and p.owner_id = (select auth.uid())
  )) or private.is_admin()
);
