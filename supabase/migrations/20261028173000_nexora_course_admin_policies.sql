-- Allow authenticated administrators to manage course content and per-course pricing.
grant insert, update, delete on public.nexora_courses to authenticated;
grant insert, update, delete on public.nexora_course_lessons to authenticated;

drop policy if exists nexora_courses_admin_manage on public.nexora_courses;
create policy nexora_courses_admin_manage on public.nexora_courses
for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

drop policy if exists nexora_course_lessons_admin_manage on public.nexora_course_lessons;
create policy nexora_course_lessons_admin_manage on public.nexora_course_lessons
for all to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
