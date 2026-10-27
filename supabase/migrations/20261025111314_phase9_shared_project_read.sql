-- Phase 9 follow-up: allow project members to view shared projects and their assets.
drop policy if exists projects_select_owner_or_member on public.studio_projects;
create policy projects_select_owner_or_member on public.studio_projects
for select to authenticated
using (
  owner_id = (select auth.uid())
  or (select private.is_project_member(id, (select auth.uid())))
);

drop policy if exists assets_select_owner_or_project_member on public.studio_assets;
create policy assets_select_owner_or_project_member on public.studio_assets
for select to authenticated
using (
  owner_id = (select auth.uid())
  or (select private.is_project_member(project_id, (select auth.uid())))
);