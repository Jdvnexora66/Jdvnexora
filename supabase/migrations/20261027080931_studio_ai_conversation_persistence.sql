create table if not exists public.studio_ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(btrim(content)) between 1 and 20000),
  created_at timestamptz not null default now()
);

create index if not exists studio_ai_messages_owner_conversation_created_idx
  on public.studio_ai_messages (user_id, conversation_id, created_at, id);

alter table public.studio_ai_messages enable row level security;

drop policy if exists "Users read own Studio AI messages" on public.studio_ai_messages;
create policy "Users read own Studio AI messages"
  on public.studio_ai_messages for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own Studio AI messages" on public.studio_ai_messages;
create policy "Users insert own Studio AI messages"
  on public.studio_ai_messages for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own Studio AI messages" on public.studio_ai_messages;
create policy "Users delete own Studio AI messages"
  on public.studio_ai_messages for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.studio_ai_messages from anon;
grant select, insert, delete on public.studio_ai_messages to authenticated;
