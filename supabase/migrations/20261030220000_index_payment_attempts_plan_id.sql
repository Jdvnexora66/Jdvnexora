-- Cover the foreign key used to join payment attempts to their subscription plan.
-- The table is currently empty in production; this additive index is safe to build online
-- during the normal migration window and avoids unindexed FK lookups as payment history grows.
create index if not exists payment_attempts_plan_id_idx
  on public.payment_attempts (plan_id);
