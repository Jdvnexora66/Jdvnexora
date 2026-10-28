-- Enforce subscription quotas for Studio IA with server-side, atomic reservations.
create or replace function public.nexora_reserve_ai_usage(p_request_id text default null)
returns table(allowed boolean, reason text, quota numeric, used numeric, usage_id bigint, plan_code text)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_user uuid := auth.uid();
  v_plan_code text;
  v_quota numeric;
  v_used numeric;
  v_usage_id bigint;
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  -- Serialize quota decisions per user so concurrent requests cannot overspend.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 721904));

  select p.code,
         case when p.features ? 'monthly_ai_units'
              then (p.features->>'monthly_ai_units')::numeric
              else 0 end
    into v_plan_code, v_quota
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.user_id = v_user
    and s.status in ('active','trialing')
    and (s.ends_at is null or s.ends_at > now())
    and p.active = true
  order by s.created_at desc
  limit 1;

  if v_plan_code is null then
    select p.code, (p.features->>'monthly_ai_units')::numeric
      into v_plan_code, v_quota
    from public.plans p
    where p.code = 'decouverte' and p.active = true
    limit 1;
  end if;

  if v_plan_code is null or v_quota is null or v_quota < 0 then
    return query select false, 'plan_not_configured'::text, 0::numeric, 0::numeric, null::bigint, null::text;
    return;
  end if;

  select coalesce(sum(u.units), 0)
    into v_used
  from public.usage_records u
  where u.user_id = v_user
    and u.feature = 'studio-ai'
    and u.created_at >= date_trunc('month', now())
    and u.created_at < date_trunc('month', now()) + interval '1 month'
    and u.status in ('reserved','completed');

  if v_used + 1 > v_quota then
    return query select false, 'quota_exceeded'::text, v_quota, v_used, null::bigint, v_plan_code;
    return;
  end if;

  insert into public.usage_records(user_id, feature, request_id, units, status, metadata)
  values (v_user, 'studio-ai', nullif(left(coalesce(p_request_id,''), 160), ''), 1, 'reserved',
          jsonb_build_object('plan_code', v_plan_code, 'quota_period', to_char(date_trunc('month', now()), 'YYYY-MM')))
  returning id into v_usage_id;

  return query select true, 'reserved'::text, v_quota, v_used + 1, v_usage_id, v_plan_code;
end;
$$;

create or replace function public.nexora_finalize_ai_usage(
  p_usage_id bigint,
  p_status text,
  p_input_tokens integer default null,
  p_output_tokens integer default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_status not in ('completed','failed','released') then
    raise exception 'Invalid usage status' using errcode = '22023';
  end if;
  update public.usage_records
     set status = p_status,
         input_tokens = case when p_input_tokens between 0 and 2147483647 then p_input_tokens else null end,
         output_tokens = case when p_output_tokens between 0 and 2147483647 then p_output_tokens else null end
   where id = p_usage_id and user_id = v_user and feature = 'studio-ai' and status = 'reserved';
  return found;
end;
$$;

revoke all on function public.nexora_reserve_ai_usage(text) from public, anon;
revoke all on function public.nexora_finalize_ai_usage(bigint, text, integer, integer) from public, anon;
grant execute on function public.nexora_reserve_ai_usage(text) to authenticated;
grant execute on function public.nexora_finalize_ai_usage(bigint, text, integer, integer) to authenticated;

comment on function public.nexora_reserve_ai_usage(text) is 'Atomically reserves one Studio IA unit against the authenticated user monthly plan quota.';
comment on function public.nexora_finalize_ai_usage(bigint, text, integer, integer) is 'Finalizes or releases a server-created Studio IA usage reservation.';
