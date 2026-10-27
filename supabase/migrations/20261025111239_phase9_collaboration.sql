-- Phase 9: project collaboration
create table if not exists public.studio_project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'commenter' check (role in ('viewer','commenter','editor')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create table if not exists public.studio_project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.studio_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists studio_project_members_user_project_idx
  on public.studio_project_members (user_id, project_id);
create index if not exists studio_project_comments_project_created_idx
  on public.studio_project_comments (project_id, created_at desc);

alter table public.studio_project_members enable row level security;
alter table public.studio_project_comments enable row level security;

create or replace function private.is_project_member(p_project_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.studio_project_members m
    where m.project_id = p_project_id and m.user_id = p_user_id
  );
$$;

revoke all on function private.is_project_member(uuid, uuid) from public;
grant execute on function private.is_project_member(uuid, uuid) to authenticated;

drop policy if exists project_members_select_owner_or_self on public.studio_project_members;
create policy project_members_select_owner_or_self on public.studio_project_members
for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.studio_projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
);

drop policy if exists project_members_insert_owner on public.studio_project_members;
create policy project_members_insert_owner on public.studio_project_members
for insert to authenticated
with check (
  exists (
    select 1 from public.studio_projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
);

drop policy if exists project_members_update_owner on public.studio_project_members;
create policy project_members_update_owner on public.studio_project_members
for update to authenticated
using (
  exists (
    select 1 from public.studio_projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.studio_projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
);

drop policy if exists project_members_delete_owner on public.studio_project_members;
create policy project_members_delete_owner on public.studio_project_members
for delete to authenticated
using (
  exists (
    select 1 from public.studio_projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
);

drop policy if exists project_comments_select_owner_or_member on public.studio_project_comments;
create policy project_comments_select_owner_or_member on public.studio_project_comments
for select to authenticated
using (
  exists (
    select 1 from public.studio_projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
  or (select private.is_project_member(project_id, (select auth.uid())))
);

drop policy if exists project_comments_insert_owner_or_contributor on public.studio_project_comments;
create policy project_comments_insert_owner_or_contributor on public.studio_project_comments
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (
    exists (
      select 1 from public.studio_projects p
      where p.id = project_id and p.owner_id = (select auth.uid())
    )
    or exists (
      select 1 from public.studio_project_members m
      where m.project_id = project_id
        and m.user_id = (select auth.uid())
        and m.role in ('commenter','editor')
    )
  )
);

drop policy if exists project_comments_update_author_or_owner on public.studio_project_comments;
create policy project_comments_update_author_or_owner on public.studio_project_comments
for update to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.studio_projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
)
with check (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.studio_projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
);

drop policy if exists project_comments_delete_author_or_owner on public.studio_project_comments;
create policy project_comments_delete_author_or_owner on public.studio_project_comments
for delete to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.studio_projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
);

grant select, insert, update, delete on public.studio_project_members to authenticated;
grant select, insert, update, delete on public.studio_project_comments to authenticated;
