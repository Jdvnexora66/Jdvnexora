begin;
select plan(11);

select has_column('public', 'studio_projects', 'organization_id',
  'studio projects support nullable organization ownership');

select ok(
  (select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname='studio_projects'),
  'studio_projects has RLS enabled');

select ok(
  (select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname='studio_assets'),
  'studio_assets has RLS enabled');

select ok(
  exists(select 1 from pg_policies where schemaname='public' and tablename='studio_projects' and policyname='studio_projects_select_tenant'),
  'tenant-aware project SELECT policy exists');

select ok(
  exists(select 1 from pg_policies where schemaname='public' and tablename='studio_projects' and policyname='studio_projects_insert_tenant'),
  'tenant-aware project INSERT policy exists');

select ok(
  exists(select 1 from pg_policies where schemaname='public' and tablename='studio_projects' and policyname='studio_projects_update_tenant'),
  'tenant-aware project UPDATE policy exists');

select ok(
  exists(select 1 from pg_policies where schemaname='public' and tablename='studio_projects' and policyname='studio_projects_delete_tenant'),
  'tenant-aware project DELETE policy exists');

select ok(
  exists(select 1 from pg_policies where schemaname='public' and tablename='studio_assets' and policyname='studio_assets_select_project_access'),
  'asset read policy checks parent project access');

select ok(
  exists(select 1 from pg_policies where schemaname='public' and tablename='studio_project_members' and policyname='studio_project_members_insert_managers'),
  'project membership changes require project management rights');

select ok(
  has_function_privilege('authenticated', 'private.can_access_studio_project(uuid,uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'private.can_access_studio_project(uuid,uuid)', 'EXECUTE'),
  'authorization helper is available to authenticated users only');

select ok(
  position('p_user_id = (select auth.uid())' in pg_get_functiondef('private.can_access_studio_project(uuid,uuid)'::regprocedure)) > 0
  and position('p_user_id = (select auth.uid())' in pg_get_functiondef('private.can_edit_studio_project(uuid,uuid)'::regprocedure)) > 0
  and position('p_user_id = (select auth.uid())' in pg_get_functiondef('private.can_manage_studio_project(uuid,uuid)'::regprocedure)) > 0,
  'authorization helpers reject checks against another user id'
);

select * from finish();
rollback;
