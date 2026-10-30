-- Split write permissions from broad ALL policies so public/owner SELECT
-- policies are evaluated only once per row. The write predicates are unchanged.

-- Creator-owned content tables
drop policy if exists analyses_manage_creator on public.content_analyses;
create policy analyses_insert_creator on public.content_analyses
for insert to authenticated with check (
  exists (select 1 from public.content_items c join public.entrepreneurs e on e.id=c.entrepreneur_id
    where c.id=content_analyses.content_item_id and e.created_by=(select auth.uid()))
);
create policy analyses_update_creator on public.content_analyses
for update to authenticated
using (exists (select 1 from public.content_items c join public.entrepreneurs e on e.id=c.entrepreneur_id
  where c.id=content_analyses.content_item_id and e.created_by=(select auth.uid())))
with check (exists (select 1 from public.content_items c join public.entrepreneurs e on e.id=c.entrepreneur_id
  where c.id=content_analyses.content_item_id and e.created_by=(select auth.uid())));
create policy analyses_delete_creator on public.content_analyses
for delete to authenticated using (
  exists (select 1 from public.content_items c join public.entrepreneurs e on e.id=c.entrepreneur_id
    where c.id=content_analyses.content_item_id and e.created_by=(select auth.uid()))
);

drop policy if exists content_items_manage_creator on public.content_items;
create policy content_items_insert_creator on public.content_items
for insert to authenticated with check (exists (select 1 from public.entrepreneurs e
  where e.id=content_items.entrepreneur_id and e.created_by=(select auth.uid())));
create policy content_items_update_creator on public.content_items
for update to authenticated
using (exists (select 1 from public.entrepreneurs e where e.id=content_items.entrepreneur_id and e.created_by=(select auth.uid())))
with check (exists (select 1 from public.entrepreneurs e where e.id=content_items.entrepreneur_id and e.created_by=(select auth.uid())));
create policy content_items_delete_creator on public.content_items
for delete to authenticated using (exists (select 1 from public.entrepreneurs e
  where e.id=content_items.entrepreneur_id and e.created_by=(select auth.uid())));

drop policy if exists social_accounts_manage_creator on public.social_accounts;
create policy social_accounts_insert_creator on public.social_accounts
for insert to authenticated with check (exists (select 1 from public.entrepreneurs e
  where e.id=social_accounts.entrepreneur_id and e.created_by=(select auth.uid())));
create policy social_accounts_update_creator on public.social_accounts
for update to authenticated
using (exists (select 1 from public.entrepreneurs e where e.id=social_accounts.entrepreneur_id and e.created_by=(select auth.uid())))
with check (exists (select 1 from public.entrepreneurs e where e.id=social_accounts.entrepreneur_id and e.created_by=(select auth.uid())));
create policy social_accounts_delete_creator on public.social_accounts
for delete to authenticated using (exists (select 1 from public.entrepreneurs e
  where e.id=social_accounts.entrepreneur_id and e.created_by=(select auth.uid())));

drop policy if exists timeline_manage_creator on public.timeline_events;
create policy timeline_insert_creator on public.timeline_events
for insert to authenticated with check (exists (select 1 from public.entrepreneurs e
  where e.id=timeline_events.entrepreneur_id and e.created_by=(select auth.uid())));
create policy timeline_update_creator on public.timeline_events
for update to authenticated
using (exists (select 1 from public.entrepreneurs e where e.id=timeline_events.entrepreneur_id and e.created_by=(select auth.uid())))
with check (exists (select 1 from public.entrepreneurs e where e.id=timeline_events.entrepreneur_id and e.created_by=(select auth.uid())));
create policy timeline_delete_creator on public.timeline_events
for delete to authenticated using (exists (select 1 from public.entrepreneurs e
  where e.id=timeline_events.entrepreneur_id and e.created_by=(select auth.uid())));

-- Administrator-managed tables; existing SELECT policies already include admins.
drop policy if exists nexora_course_lessons_admin_manage on public.nexora_course_lessons;
create policy nexora_course_lessons_admin_insert on public.nexora_course_lessons for insert to authenticated with check ((select private.is_admin()));
create policy nexora_course_lessons_admin_update on public.nexora_course_lessons for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy nexora_course_lessons_admin_delete on public.nexora_course_lessons for delete to authenticated using ((select private.is_admin()));

drop policy if exists nexora_courses_admin_manage on public.nexora_courses;
create policy nexora_courses_admin_insert on public.nexora_courses for insert to authenticated with check ((select private.is_admin()));
create policy nexora_courses_admin_update on public.nexora_courses for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy nexora_courses_admin_delete on public.nexora_courses for delete to authenticated using ((select private.is_admin()));

drop policy if exists plans_admin_manage on public.plans;
create policy plans_admin_insert on public.plans for insert to authenticated with check (private.is_admin());
create policy plans_admin_update on public.plans for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy plans_admin_delete on public.plans for delete to authenticated using (private.is_admin());

drop policy if exists subscriptions_admin_manage on public.subscriptions;
create policy subscriptions_admin_insert on public.subscriptions for insert to authenticated with check (private.is_admin());
create policy subscriptions_admin_update on public.subscriptions for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy subscriptions_admin_delete on public.subscriptions for delete to authenticated using (private.is_admin());

drop policy if exists completion_admin_manage on public.training_completions;
create policy completion_admin_insert on public.training_completions for insert to authenticated with check (private.is_admin());
create policy completion_admin_update on public.training_completions for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy completion_admin_delete on public.training_completions for delete to authenticated using (private.is_admin());

drop policy if exists courses_admin_manage on public.training_courses;
create policy courses_admin_insert on public.training_courses for insert to authenticated with check (private.is_admin());
create policy courses_admin_update on public.training_courses for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy courses_admin_delete on public.training_courses for delete to authenticated using (private.is_admin());

drop policy if exists visual_studio_publications_admin_write on public.visual_studio_publications;
create policy visual_studio_publications_admin_insert on public.visual_studio_publications for insert to authenticated with check ((select private.is_admin()));
create policy visual_studio_publications_admin_update on public.visual_studio_publications for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy visual_studio_publications_admin_delete on public.visual_studio_publications for delete to authenticated using ((select private.is_admin()));

-- Merge duplicate SELECT rules without reducing owner/admin/member access.
drop policy if exists assets_owner_or_admin_access on public.studio_assets;
drop policy if exists assets_select_owner_or_project_member on public.studio_assets;
create policy assets_select_owner_admin_or_project_member on public.studio_assets
for select to authenticated using (
  owner_id=(select auth.uid()) or private.is_admin()
  or (select private.is_project_member(studio_assets.project_id,(select auth.uid())))
);

drop policy if exists projects_owner_or_admin_access on public.studio_projects;
drop policy if exists projects_select_owner_or_member on public.studio_projects;
create policy projects_select_owner_admin_or_member on public.studio_projects
for select to authenticated using (
  owner_id=(select auth.uid()) or private.is_admin()
  or (select private.is_project_member(studio_projects.id,(select auth.uid())))
);
