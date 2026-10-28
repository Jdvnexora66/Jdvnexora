-- Restrict Studio AI usage finalization to the trusted Edge Function service role.
-- Authenticated clients may reserve their own quota but cannot forge token counts or status.
drop function if exists public.nexora_finalize_ai_usage(bigint, text, integer, integer);

create function public.nexora_finalize_ai_usage(
  p_user_id uuid,
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
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  if p_user_id is null then
    raise exception 'User id required' using errcode = '22023';
  end if;

  if p_status <> 'completed' then
    raise exception 'Only completed usage can be finalized' using errcode = '22023';
  end if;

  update public.usage_records
     set status = 'completed',
         input_tokens = case when p_input_tokens >= 0 then p_input_tokens else null end,
         output_tokens = case when p_output_tokens >= 0 then p_output_tokens else null end
   where id = p_usage_id
     and user_id = p_user_id
     and feature = 'studio-ai'
     and status = 'reserved';

  return found;
end;
$function$;

revoke all on function public.nexora_finalize_ai_usage(uuid, bigint, text, integer, integer) from public, anon, authenticated;
grant execute on function public.nexora_finalize_ai_usage(uuid, bigint, text, integer, integer) to service_role;

comment on function public.nexora_finalize_ai_usage(uuid, bigint, text, integer, integer)
is 'Finalizes a Studio IA reservation only from the trusted service-role backend.';
