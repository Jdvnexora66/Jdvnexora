-- JDV NEXORA: private roadmap goals and tasks.
create table if not exists public.roadmap_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 180),
  description text,
  status text not null default 'planned' check (status in ('planned','in_progress','completed','paused')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  due_date date,
  position integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists roadmap_tasks_owner_status_idx on public.roadmap_tasks(user_id, status, position, due_date);
alter table public.roadmap_tasks enable row level security;
drop policy if exists roadmap_tasks_select_own on public.roadmap_tasks;
create policy roadmap_tasks_select_own on public.roadmap_tasks for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists roadmap_tasks_insert_own on public.roadmap_tasks;
create policy roadmap_tasks_insert_own on public.roadmap_tasks for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists roadmap_tasks_update_own on public.roadmap_tasks;
create policy roadmap_tasks_update_own on public.roadmap_tasks for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists roadmap_tasks_delete_own on public.roadmap_tasks;
create policy roadmap_tasks_delete_own on public.roadmap_tasks for delete to authenticated using (user_id = (select auth.uid()));
drop trigger if exists roadmap_tasks_updated_at on public.roadmap_tasks;
create trigger roadmap_tasks_updated_at before update on public.roadmap_tasks for each row execute function public.nexora_set_updated_at();
