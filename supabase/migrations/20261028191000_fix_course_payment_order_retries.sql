create or replace function public.nexora_create_course_payment_order(p_course_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_course public.nexora_courses%rowtype;
  v_enrollment public.nexora_course_enrollments%rowtype;
  v_order public.nexora_course_payment_orders%rowtype;
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
  if v_course.price_xof <= 0 then
    raise exception 'course_is_free' using errcode = 'P0001';
  end if;

  select * into v_enrollment
  from public.nexora_course_enrollments
  where course_id = v_course.id and user_id = v_user
  for update;

  if found and v_enrollment.status = 'active' then
    return jsonb_build_object('already_enrolled', true, 'course_id', v_course.id, 'status', 'active');
  end if;

  if not found then
    insert into public.nexora_course_enrollments(course_id,user_id,status)
    values (v_course.id,v_user,'pending')
    on conflict (course_id,user_id) do nothing;
    select * into v_enrollment
    from public.nexora_course_enrollments
    where course_id = v_course.id and user_id = v_user
    for update;
  elsif v_enrollment.status in ('revoked','refunded') then
    update public.nexora_course_enrollments
    set status='pending',completed_at=null,updated_at=now()
    where id=v_enrollment.id
    returning * into v_enrollment;
  end if;

  select * into v_order
  from public.nexora_course_payment_orders
  where enrollment_id = v_enrollment.id
  for update;

  if found and v_order.status='succeeded' then
    return jsonb_build_object('already_paid',true,'course_id',v_course.id,'status','succeeded');
  end if;

  if found and v_order.status in ('pending','verification_required')
     and v_order.amount_xof = v_course.price_xof then
    return jsonb_build_object(
      'order_id',v_order.id,'course_id',v_course.id,'enrollment_id',v_enrollment.id,
      'amount_xof',v_order.amount_xof,'currency',v_order.currency,'provider',v_order.provider,
      'provider_mode',v_order.provider_mode,'provider_reference',v_order.provider_reference,
      'status',v_order.status,'payment_started',false
    );
  end if;

  if found then
    update public.nexora_course_payment_orders
    set status='pending', amount_xof=v_course.price_xof, currency='XOF',
        provider_mode='sandbox', provider_reference=gen_random_uuid()::text,
        verified_at=null, updated_at=now()
    where id=v_order.id
    returning * into v_order;
  else
    insert into public.nexora_course_payment_orders(
      enrollment_id,course_id,user_id,provider_mode,amount_xof,currency,status,provider_reference
    ) values (
      v_enrollment.id,v_course.id,v_user,'sandbox',v_course.price_xof,'XOF','pending',gen_random_uuid()::text
    )
    returning * into v_order;
  end if;

  return jsonb_build_object(
    'order_id',v_order.id,'course_id',v_course.id,'enrollment_id',v_enrollment.id,
    'amount_xof',v_order.amount_xof,'currency',v_order.currency,'provider',v_order.provider,
    'provider_mode',v_order.provider_mode,'provider_reference',v_order.provider_reference,
    'status',v_order.status,'payment_started',false
  );
end;
$$;

revoke all on function public.nexora_create_course_payment_order(uuid) from public, anon;
grant execute on function public.nexora_create_course_payment_order(uuid) to authenticated;
