-- Phase 10: subscription and pricing foundation.
alter table public.plans
  add column if not exists price_minor integer not null default 0 check (price_minor >= 0),
  add column if not exists currency text not null default 'XOF' check (currency ~ '^[A-Z]{3}$'),
  add column if not exists billing_interval text not null default 'month' check (billing_interval in ('month','year','one_time')),
  add column if not exists trial_days integer not null default 0 check (trial_days between 0 and 365);

create index if not exists subscriptions_user_status_idx on public.subscriptions (user_id, status);
create index if not exists plans_active_created_idx on public.plans (active, created_at desc);