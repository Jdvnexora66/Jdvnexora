-- Keep subscription state aligned with the contractual end date.
-- The job runs as the scheduling database role (postgres) and does not expose a client RPC.
create index if not exists subscriptions_status_ends_at_idx
  on public.subscriptions (status, ends_at)
  where status in ('active', 'trialing') and ends_at is not null;

do $$
begin
  if not exists (
    select 1 from cron.job
    where jobname = 'nexora-subscription-expiry-every-15-min'
  ) then
    perform cron.schedule(
      'nexora-subscription-expiry-every-15-min',
      '*/15 * * * *',
      $job$
        update public.subscriptions
        set status = 'expired',
            updated_at = now()
        where status in ('active', 'trialing')
          and ends_at is not null
          and ends_at <= now();
      $job$
    );
  end if;
end
$$;
