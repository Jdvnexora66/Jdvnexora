-- Prevent authenticated clients from releasing/failing their own Studio AI reservations.
-- Only a completed request may be finalized through the user-scoped RPC. Failed requests
-- remain reserved temporarily and are excluded automatically after the 15-minute TTL.
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
as $function$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  -- Do not let a client mark its reservation failed/released to evade monthly quotas.
  if p_status <> 'completed' then
    raise exception 'Only completed usage can be finalized by a client' using errcode = '22023';
  end if;

  update public.usage_records
     set status = 'completed',
         input_tokens = case when p_input_tokens between 0 and 2147483647 then p_input_tokens else null end,
         output_tokens = case when p_output_tokens between 0 and 2147483647 then p_output_tokens else null end
   where id = p_usage_id
     and user_id = v_user
     and feature = 'studio-ai'
     and status = 'reserved';
  return found;
end;
$function$;

revoke all on function public.nexora_finalize_ai_usage(bigint,text,integer,integer) from public, anon;
grant execute on function public.nexora_finalize_ai_usage(bigint,text,integer,integer) to authenticated;
