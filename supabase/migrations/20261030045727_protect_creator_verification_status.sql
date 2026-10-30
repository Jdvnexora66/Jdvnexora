-- Keep creator verification under NEXORA editorial/admin control.
-- Ordinary creators may submit and edit profiles, but cannot self-assign a trusted badge.

create or replace function private.nexora_guard_creator_verification()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.verification_status is distinct from old.verification_status
     and current_user not in ('postgres', 'service_role')
     and not coalesce((select private.is_admin()), false) then
    raise exception 'Only a NEXORA administrator can change a creator verification status.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists entrepreneurs_guard_verification on public.entrepreneurs;
create trigger entrepreneurs_guard_verification
before update of verification_status on public.entrepreneurs
for each row
execute function private.nexora_guard_creator_verification();

drop policy if exists entrepreneurs_insert_authenticated on public.entrepreneurs;
create policy entrepreneurs_insert_authenticated
on public.entrepreneurs
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and verification_status = 'unverified'
);

drop policy if exists entrepreneurs_admin_insert on public.entrepreneurs;
create policy entrepreneurs_admin_insert
on public.entrepreneurs
for insert
to authenticated
with check ((select private.is_admin()));

drop policy if exists entrepreneurs_admin_update on public.entrepreneurs;
create policy entrepreneurs_admin_update
on public.entrepreneurs
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

comment on function private.nexora_guard_creator_verification()
is 'Prevents non-admin users from changing creator verification status.';
