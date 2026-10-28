-- Tenant isolation for JDV NEXORA Studio projects.
-- Additive migration: existing projects remain personal (organization_id IS NULL).
-- Apply only after reviewing this migration and running staging tests.

alter table public.studio_projects
  add column if not exists organization_id uuid
  references public.organizations(id) on delete restrict;

create index if not exists studio_projects_organization_created_idx
  on public.studio_projects (organization_id, created_at desc)
  where organization_id is not null;

create or replace function private.can_access_studio_project(
  p_project_id uuid,
  p_user_id uuid default auth.uid()
) returns boolean
language sql stable security definer
set search_path = pg_catalog, public, private, auth
as $$
  select exists (
    select 1
    from public.studio_projects p
    where p.id = p_project_id
      and p_user_id = (select auth.uid())
      and (
        private.is_admin()
        or (
          p.organization_id is null and (
            p.owner_id = p_user_id
            or exists (
              select 1 from public.studio_project_members pm
              where pm.project_id = p.id and pm.user_id = p_user_id
            )
          )
        )
        or (
          p.organization_id is not null
          and private.is_org_member(p.organization_id)
          and (
            p.owner_id = p_user_id
            or private.has_org_role(p.organization_id, array['owner','admin','manager'])
            or exists (
              select 1 from public.studio_project_members pm
              where pm.project_id = p.id and pm.user_id = p_user_id
            )
          )
        )
      )
  );
$$;

create or replace function private.can_edit_studio_project(
  p_project_id uuid,
  p_user_id uuid default auth.uid()
) returns boolean
language sql stable security definer
set search_path = pg_catalog, public, private, auth
as $$
  select exists (
    select 1
    from public.studio_projects p
    where p.id = p_project_id
      and p_user_id = (select auth.uid())
      and (
        private.is_admin()
        or (
          p.organization_id is null
          and (
            p.owner_id = p_user_id
            or exists (
              select 1 from public.studio_project_members pm
              where pm.project_id = p.id
                and pm.user_id = p_user_id
                and pm.role = 'editor'
            )
          )
        )
        or (
          p.organization_id is not null
          and private.is_org_member(p.organization_id)
          and (
            private.has_org_role(p.organization_id, array['owner','admin','manager'])
            or exists (
              select 1 from public.studio_project_members pm
              where pm.project_id = p.id
                and pm.user_id = p_user_id
                and pm.role = 'editor'
            )
          )
        )
      )
  );
$$;

create or replace function private.can_manage_studio_project(
  p_project_id uuid,
  p_user_id uuid default auth.uid()
) returns boolean
language sql stable security definer
set search_path = pg_catalog, public, private, auth
as $$
  select exists (
    select 1
    from public.studio_projects p
    where p.id = p_project_id
      and p_user_id = (select auth.uid())
      and (
        private.is_admin()
        or (
          p.organization_id is null and p.owner_id = p_user_id
        )
        or (
          p.organization_id is not null
          and private.has_org_role(p.organization_id, array['owner','admin'])
        )
      )
  );
$$;

create or replace function private.validate_studio_project_tenant()
returns trigger
language plpgsql security definer
set search_path = pg_catalog, public, private, auth
as $$
begin
  if new.organization_id is null then
    -- A personal project must remain owned by its authenticated creator.
    if new.owner_id is distinct from (select auth.uid())
       and not private.is_admin() then
      raise exception 'Personal project owner must match the authenticated user'
        using errcode = '42501';
    end if;
  else
    if not private.is_org_member(new.organization_id)
       and not private.is_admin() then
      raise exception 'Active organization membership is required'
        using errcode = '42501';
    end if;

    if not private.has_org_role(new.organization_id, array['owner','admin','manager'])
       and not private.is_admin() then
      raise exception 'Organization role does not permit project changes'
        using errcode = '42501';
    end if;

    if new.owner_id is distinct from (select auth.uid())
       and not private.is_admin() then
      raise exception 'Project owner must match the authenticated user'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists studio_projects_validate_tenant on public.studio_projects;
create trigger studio_projects_validate_tenant
before insert or update of organization_id, owner_id
on public.studio_projects
for each row execute function private.validate_studio_project_tenant();

-- Replace permissive policies: PostgreSQL ORs permissive policies together.
drop policy if exists projects_owner_or_admin_access on public.studio_projects;
drop policy if exists projects_select_owner_or_member on public.studio_projects;
drop policy if exists projects_insert_owner_basic_free on public.studio_projects;
drop policy if exists projects_update_owner_basic_free on public.studio_projects;
drop policy if exists projects_delete_owner_or_admin on public.studio_projects;

create policy studio_projects_select_tenant
on public.studio_projects for select to authenticated
using (private.can_access_studio_project(id, (select auth.uid())));

create policy studio_projects_insert_tenant
on public.studio_projects for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and (
    organization_id is null
    or private.has_org_role(organization_id, array['owner','admin','manager'])
  )
);

create policy studio_projects_update_tenant
on public.studio_projects for update to authenticated
using (private.can_edit_studio_project(id, (select auth.uid())))
with check (
  private.can_edit_studio_project(id, (select auth.uid()))
  and (
    organization_id is null
    or private.is_org_member(organization_id)
  )
);

create policy studio_projects_delete_tenant
on public.studio_projects for delete to authenticated
using (
  private.is_admin()
  or (organization_id is null and owner_id = (select auth.uid()))
  or (
    organization_id is not null
    and private.has_org_role(organization_id, array['owner','admin'])
  )
);

-- Assets inherit access from their parent project, not merely asset.owner_id.
drop policy if exists assets_delete_owner_or_admin on public.studio_assets;
drop policy if exists assets_insert_owner_project on public.studio_assets;
drop policy if exists assets_owner_or_admin_access on public.studio_assets;
drop policy if exists assets_select_owner_or_project_member on public.studio_assets;
drop policy if exists assets_update_owner_project on public.studio_assets;

create policy studio_assets_select_project_access
on public.studio_assets for select to authenticated
using (
  private.can_access_studio_project(project_id, (select auth.uid()))
  or private.is_admin()
);

create policy studio_assets_insert_project_editors
on public.studio_assets for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and private.can_edit_studio_project(project_id, (select auth.uid()))
);

create policy studio_assets_update_project_editors
on public.studio_assets for update to authenticated
using (private.can_edit_studio_project(project_id, (select auth.uid())) or private.is_admin())
with check (
  private.can_edit_studio_project(project_id, (select auth.uid()))
  or private.is_admin()
);

create policy studio_assets_delete_project_managers
on public.studio_assets for delete to authenticated
using (
  private.can_manage_studio_project(project_id, (select auth.uid()))
  or private.is_admin()
);

-- Membership rows cannot be used to grant oneself access to another tenant.
drop policy if exists project_members_delete_owner on public.studio_project_members;
drop policy if exists project_members_insert_owner on public.studio_project_members;
drop policy if exists project_members_select_owner_or_self on public.studio_project_members;
drop policy if exists project_members_update_owner on public.studio_project_members;

create policy studio_project_members_select_authorized
on public.studio_project_members for select to authenticated
using (
  private.can_access_studio_project(project_id, (select auth.uid()))
  or private.is_admin()
);

create policy studio_project_members_insert_managers
on public.studio_project_members for insert to authenticated
with check (
  private.can_manage_studio_project(project_id, (select auth.uid()))
  and user_id is not null
);

create policy studio_project_members_update_managers
on public.studio_project_members for update to authenticated
using (private.can_manage_studio_project(project_id, (select auth.uid())))
with check (private.can_manage_studio_project(project_id, (select auth.uid())));

create policy studio_project_members_delete_managers
on public.studio_project_members for delete to authenticated
using (private.can_manage_studio_project(project_id, (select auth.uid())));

revoke all on function private.can_access_studio_project(uuid, uuid) from public, anon;
revoke all on function private.can_edit_studio_project(uuid, uuid) from public, anon;
revoke all on function private.can_manage_studio_project(uuid, uuid) from public, anon;
revoke all on function private.validate_studio_project_tenant() from public, anon, authenticated;
grant execute on function private.can_access_studio_project(uuid, uuid) to authenticated;
grant execute on function private.can_edit_studio_project(uuid, uuid) to authenticated;
grant execute on function private.can_manage_studio_project(uuid, uuid) to authenticated;

comment on column public.studio_projects.organization_id is
  'Nullable tenant reference. NULL preserves personal-project behavior; non-NULL requires active organization membership and role checks.';
