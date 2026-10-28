create or replace function public.nexora_enroll_free_course(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_course public.nexora_courses%rowtype;
  v_enrollment public.nexora_course_enrollments%rowtype;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  select * into v_course
  from public.nexora_courses
  where id = p_course_id and status = 'published'
  for share;

  if not found then
    raise exception 'course_not_available' using errcode = 'P0002';
  end if;

  if v_course.price_xof <> 0 then
    raise exception 'payment_required' using errcode = 'P0001';
  end if;

  insert into public.nexora_course_enrollments(course_id, user_id, status, enrolled_at)
  values (v_course.id, v_user, 'active', now())
  on conflict (course_id, user_id)
  do update set status = 'active',
                enrolled_at = coalesce(public.nexora_course_enrollments.enrolled_at, now()),
                updated_at = now()
  returning * into v_enrollment;

  return jsonb_build_object(
    'enrolled', true,
    'course_id', v_course.id,
    'enrollment_id', v_enrollment.id,
    'status', v_enrollment.status
  );
end;
$$;

revoke all on function public.nexora_enroll_free_course(uuid) from public, anon;
grant execute on function public.nexora_enroll_free_course(uuid) to authenticated;
