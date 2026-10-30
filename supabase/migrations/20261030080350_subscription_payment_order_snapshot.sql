-- Freeze the commercial terms when a subscription payment order is created.
-- Existing subscriptions are backfilled from their linked plan before NOT NULL is enforced.
alter table public.subscriptions
  add column if not exists amount_minor integer,
  add column if not exists currency text,
  add column if not exists billing_interval text;

update public.subscriptions s
set
  amount_minor = p.price_minor,
  currency = p.currency,
  billing_interval = p.billing_interval
from public.plans p
where p.id = s.plan_id
  and (
    s.amount_minor is null
    or s.currency is null
    or s.billing_interval is null
  );

alter table public.subscriptions
  alter column amount_minor set not null,
  alter column currency set not null,
  alter column billing_interval set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'subscriptions_amount_minor_nonnegative'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions
      add constraint subscriptions_amount_minor_nonnegative check (amount_minor >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'subscriptions_currency_code'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions
      add constraint subscriptions_currency_code check (currency ~ '^[A-Z]{3}$');
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'subscriptions_billing_interval'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions
      add constraint subscriptions_billing_interval check (billing_interval in ('month','year','one_time'));
  end if;
end $$;

comment on column public.subscriptions.amount_minor is
  'Immutable amount snapshot (XOF whole units for XOF plans, minor units for other currencies) captured when the subscription order is created.';
comment on column public.subscriptions.currency is
  'Immutable currency snapshot captured when the subscription order is created.';
comment on column public.subscriptions.billing_interval is
  'Immutable billing interval snapshot used to calculate the subscription end date.';
