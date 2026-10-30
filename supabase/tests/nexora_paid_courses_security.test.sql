begin;
select plan(22);

select has_table('public', 'nexora_courses', 'course catalog exists');
select has_table('public', 'nexora_course_lessons', 'course lessons exist');
select has_table('public', 'nexora_course_enrollments', 'course enrollments exist');
select has_table('public', 'nexora_course_payment_orders', 'course payment orders exist');

select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='nexora_courses'), 'course catalog has RLS enabled');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='nexora_course_lessons'), 'lessons have RLS enabled');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='nexora_course_enrollments'), 'enrollments have RLS enabled');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='nexora_course_payment_orders'), 'payment orders have RLS enabled');

select ok(not has_table_privilege('anon', 'public.nexora_course_enrollments', 'SELECT'), 'anonymous users cannot read enrollments');
select ok(not has_table_privilege('anon', 'public.nexora_course_payment_orders', 'SELECT'), 'anonymous users cannot read payment orders');
select ok(not has_table_privilege('authenticated', 'public.nexora_course_payment_orders', 'INSERT'), 'clients cannot insert payment orders directly');
select ok(not has_table_privilege('authenticated', 'public.nexora_course_payment_orders', 'UPDATE'), 'clients cannot modify payment orders directly');

select ok(not has_function_privilege('anon', 'public.nexora_enroll_free_course(uuid)', 'EXECUTE'), 'anonymous users cannot enroll in free courses');
select ok(has_function_privilege('authenticated', 'public.nexora_enroll_free_course(uuid)', 'EXECUTE'), 'signed-in users can request free enrollment through validated RPC');
select ok(not has_function_privilege('anon', 'public.nexora_create_course_payment_order(uuid)', 'EXECUTE'), 'anonymous users cannot create paid-course orders');
select ok(has_function_privilege('authenticated', 'public.nexora_create_course_payment_order(uuid)', 'EXECUTE'), 'signed-in users can create paid-course orders through validated RPC');
select ok((select proconfig @> array['search_path=""'] from pg_proc where oid='public.nexora_create_course_payment_order(uuid)'::regprocedure), 'paid-course order SECURITY DEFINER RPC has an empty search_path');
select ok((select proconfig @> array['search_path=""'] from pg_proc where oid='public.nexora_enroll_free_course(uuid)'::regprocedure), 'free-course enrollment SECURITY DEFINER RPC has an empty search_path');
select ok((select proconfig @> array['search_path=""'] from pg_proc where oid='public.nexora_reserve_ai_usage(text)'::regprocedure), 'AI quota reservation SECURITY DEFINER RPC has an empty search_path');
select ok(not has_function_privilege('anon', 'public.nexora_finalize_ai_usage(uuid,bigint,text,integer,integer)', 'EXECUTE'), 'anonymous users cannot finalize AI quota usage');
select ok(not has_function_privilege('authenticated', 'public.nexora_finalize_ai_usage(uuid,bigint,text,integer,integer)', 'EXECUTE'), 'authenticated clients cannot forge AI usage finalization');
select ok(has_function_privilege('service_role', 'public.nexora_finalize_ai_usage(uuid,bigint,text,integer,integer)', 'EXECUTE'), 'trusted server can finalize AI usage');
select ok(to_regprocedure('public.nexora_finalize_ai_usage(bigint,text,integer,integer)') is null, 'old client-callable finalization RPC is removed');

select * from finish();
rollback;
