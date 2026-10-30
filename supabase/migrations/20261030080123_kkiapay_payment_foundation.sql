-- KKiaPay payment foundation (test mode first).
-- No client can insert payment state or mark subscriptions active.
create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete restrict,
  provider text not null default 'kkiapay' check (provider = 'kkiapay'),
  provider_mode text not null default 'sandbox' check (provider_mode in ('sandbox','live')),
  amount_minor integer not null check (amount_minor > 0),
  currency text not null check (currency = 'XOF'),
  status text not null default 'pending' check (status in ('pending','verification_required','succeeded','failed','expired')),
  provider_reference text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object')
);
create index if not exists payment_attempts_user_created_idx on public.payment_attempts(user_id, created_at desc);
create index if not exists payment_attempts_status_created_idx on public.payment_attempts(status, created_at);

create table if not exists public.payment_webhook_events (
  id bigint generated always as identity primary key,
  provider text not null default 'kkiapay' check (provider = 'kkiapay'),
  provider_event_id text,
  transaction_id text not null,
  event_type text not null,
  signature_verified boolean not null default false,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  unique(provider, transaction_id, event_type)
);
alter table public.payment_attempts enable row level security;
alter table public.payment_webhook_events enable row level security;
revoke all on public.payment_attempts from anon, authenticated;
revoke all on public.payment_webhook_events from anon, authenticated;
grant select on public.payment_attempts to authenticated;
drop policy if exists payment_attempts_select_owner on public.payment_attempts;
create policy payment_attempts_select_owner on public.payment_attempts
  for select to authenticated using (user_id = (select auth.uid()));
-- No client policies for writes or webhook-event reads/writes; trusted server only.
