-- Consolidate owner/admin permissions to avoid duplicate permissive RLS policies.
drop policy if exists entrepreneurs_admin_insert on public.entrepreneurs;
drop policy if exists entrepreneurs_admin_update on public.entrepreneurs;

drop policy if exists entrepreneurs_insert_authenticated on public.entrepreneurs;
create policy entrepreneurs_insert_authenticated
on public.entrepreneurs
for insert
to authenticated
with check (
  (
    created_by = (select auth.uid())
    and verification_status = 'unverified'
  )
  or (select private.is_admin())
);

drop policy if exists entrepreneurs_update_creator on public.entrepreneurs;
create policy entrepreneurs_update_creator
on public.entrepreneurs
for update
to authenticated
using (
  created_by = (select auth.uid())
  or (select private.is_admin())
)
with check (
  created_by = (select auth.uid())
  or (select private.is_admin())
);