-- JDV NEXORA: complete owner-scoped read/delete policies for project workspace.
-- Safe to re-run. Existing ownership checks remain enforced by RLS.

alter table public.studio_projects enable row level security;
alter table public.studio_assets enable row level security;

drop policy if exists projects_select_owner on public.studio_projects;
create policy projects_select_owner
on public.studio_projects for select to authenticated
using (owner_id = (select auth.uid()) or private.is_admin());

drop policy if exists projects_delete_owner on public.studio_projects;
create policy projects_delete_owner
on public.studio_projects for delete to authenticated
using (owner_id = (select auth.uid()) or private.is_admin());

drop policy if exists assets_select_owner_project on public.studio_assets;
create policy assets_select_owner_project
on public.studio_assets for select to authenticated
using (
  (owner_id = (select auth.uid()) and exists (
    select 1 from public.studio_projects p
    where p.id = studio_assets.project_id and p.owner_id = (select auth.uid())
  )) or private.is_admin()
);

drop policy if exists assets_delete_owner_project on public.studio_assets;
create policy assets_delete_owner_project
on public.studio_assets for delete to authenticated
using (
  (owner_id = (select auth.uid()) and exists (
    select 1 from public.studio_projects p
    where p.id = studio_assets.project_id and p.owner_id = (select auth.uid())
  )) or private.is_admin()
);
