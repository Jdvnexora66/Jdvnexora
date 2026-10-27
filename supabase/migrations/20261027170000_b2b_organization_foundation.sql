-- JDV NEXORA B2B foundation: additive migration, no existing data is dropped.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'),
  created_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  status text not null default 'active' check (status in ('active','suspended','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null default 'member' check (role in ('owner','admin','manager','member','viewer')),
  status text not null default 'active' check (status in ('active','suspended')),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (char_length(btrim(email)) between 3 and 320),
  role text not null default 'member' check (role in ('admin','manager','member','viewer')),
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.usage_records (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete restrict,
  organization_id uuid references public.organizations(id) on delete restrict,
  feature text not null check (char_length(btrim(feature)) between 1 and 120),
  provider text,
  model text,
  request_id text,
  units numeric(14,4) not null default 1 check (units >= 0),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  estimated_cost_minor bigint check (estimated_cost_minor is null or estimated_cost_minor >= 0),
  status text not null default 'completed' check (status in ('reserved','completed','failed','released')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists organization_members_user_status_idx
  on public.organization_members(user_id, status);
create index if not exists organization_members_org_role_idx
  on public.organization_members(organization_id, role, status);
create index if not exists organization_invitations_org_status_idx
  on public.organization_invitations(organization_id, status, expires_at);
create index if not exists organization_invitations_email_idx
  on public.organization_invitations(lower(email), status);
create index if not exists usage_records_user_created_idx
  on public.usage_records(user_id, created_at desc);
create index if not exists usage_records_org_created_idx
  on public.usage_records(organization_id, created_at desc);
create index if not exists organizations_created_by_idx
  on public.organizations(created_by);
create index if not exists organization_members_user_id_idx
  on public.organization_members(user_id);
create index if not exists organization_invitations_invited_by_idx
  on public.organization_invitations(invited_by);
create index if not exists usage_records_request_id_idx
  on public.usage_records(request_id) where request_id is not null;

create or replace function private.is_org_member(p_organization_id uuid)
returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.organization_members m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and o.status = 'active'
  );
$$;

create or replace function private.has_org_role(p_organization_id uuid, p_roles text[])
returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.organization_members m
    join public.organizations o on o.id = m.organization_id
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and o.status = 'active'
      and m.role = any(p_roles)
  );
$$;

create or replace function private.add_organization_owner()
returns trigger
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.organization_members (organization_id, user_id, role, status)
  values (new.id, new.created_by, 'owner', 'active')
  on conflict (organization_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists organizations_add_owner on public.organizations;
create trigger organizations_add_owner
after insert on public.organizations
for each row execute function private.add_organization_owner();

create or replace function private.prevent_organization_creator_change()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'Organization creator is immutable';
  end if;
  return new;
end;
$;

revoke all on function private.prevent_organization_creator_change() from public, anon, authenticated;

drop trigger if exists organizations_creator_immutable on public.organizations;
create trigger organizations_creator_immutable
before update of created_by on public.organizations
for each row execute function private.prevent_organization_creator_change();

drop trigger if exists organizations_touch_updated_at on public.organizations;
create trigger organizations_touch_updated_at
before update on public.organizations
for each row execute function public.touch_updated_at();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.usage_records enable row level security;

drop policy if exists organizations_select_members on public.organizations;
create policy organizations_select_members on public.organizations
for select to authenticated
using (private.is_org_member(id));

drop policy if exists organizations_insert_self on public.organizations;
create policy organizations_insert_self on public.organizations
for insert to authenticated
with check (created_by = (select auth.uid()) and status = 'active');

drop policy if exists organizations_update_owner_admin on public.organizations;
create policy organizations_update_owner_admin on public.organizations
for update to authenticated
using (private.has_org_role(id, array['owner','admin']))
with check (private.has_org_role(id, array['owner','admin']));

drop policy if exists organization_members_select_members on public.organization_members;
create policy organization_members_select_members on public.organization_members
for select to authenticated
using (private.is_org_member(organization_id));

drop policy if exists usage_records_select_self_or_org_admin on public.usage_records;
create policy usage_records_select_self_or_org_admin on public.usage_records
for select to authenticated
using (
  user_id = (select auth.uid())
  or (organization_id is not null and private.has_org_role(organization_id, array['owner','admin']))
);

-- Client roles cannot directly mutate membership rows; trusted server-side flows manage membership changes.
revoke insert, update, delete on public.organization_members from anon, authenticated;

-- Client roles can never create or alter usage/billing facts directly.
revoke insert, update, delete on public.usage_records from anon, authenticated;
grant select on public.usage_records to authenticated;

-- Invitation metadata and token hashes are server-only; manage through trusted Edge Functions.
revoke all on public.organization_invitations from anon, authenticated;

-- Organizations are archived/suspended through status, not deleted from the client.

revoke all on function private.is_org_member(uuid) from public, anon;
revoke all on function private.has_org_role(uuid, text[]) from public, anon;
revoke all on function private.add_organization_owner() from public, anon, authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_role(uuid, text[]) to authenticated;

comment on table public.organizations is 'B2B tenant boundary; access is controlled by organization membership and RLS.';
comment on table public.organization_members is 'Organization membership and least-privilege roles.';
comment on table public.organization_invitations is 'Invitation records; store only a cryptographic hash of the invitation token.';
comment on table public.usage_records is 'Server-authored AI usage ledger; client roles have read-only access.';
