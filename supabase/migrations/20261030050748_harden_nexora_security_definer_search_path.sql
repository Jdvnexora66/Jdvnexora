-- Harden SECURITY DEFINER RPCs while preserving the authenticated workflows.
-- Every table and auth reference in these functions is schema-qualified.
alter function public.nexora_create_course_payment_order(uuid)
  set search_path = '';
alter function public.nexora_enroll_free_course(uuid)
  set search_path = '';
alter function public.nexora_reserve_ai_usage(text)
  set search_path = '';

revoke all on function public.nexora_create_course_payment_order(uuid) from public, anon;
revoke all on function public.nexora_enroll_free_course(uuid) from public, anon;
revoke all on function public.nexora_reserve_ai_usage(text) from public, anon;

grant execute on function public.nexora_create_course_payment_order(uuid) to authenticated;
grant execute on function public.nexora_enroll_free_course(uuid) to authenticated;
grant execute on function public.nexora_reserve_ai_usage(text) to authenticated;
