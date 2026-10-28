-- Paid courses are independent from platform subscription plans.
create table if not exists public.nexora_courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  short_description text not null default '',
  description text not null default '',
  instructor_name text,
  cover_image_url text,
  price_xof bigint not null default 0 check (price_xof >= 0),
  is_free boolean generated always as (price_xof = 0) stored,
  currency text not null default 'XOF' check (currency = 'XOF'),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  level text not null default 'Tous niveaux' check (length(level) <= 80),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.nexora_course_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.nexora_courses(id) on delete cascade,
  title text not null,
  description text not null default '',
  content_type text not null default 'text' check (content_type in ('text','video','document','external')),
  content text,
  media_url text,
  position integer not null default 0,
  is_preview boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(course_id, position)
);

create table if not exists public.nexora_course_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.nexora_courses(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','active','revoked','refunded')),
  enrolled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(course_id, user_id)
);

create table if not exists public.nexora_course_payment_orders (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null unique references public.nexora_course_enrollments(id) on delete restrict,
  course_id uuid not null references public.nexora_courses(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'kkiapay' check (provider = 'kkiapay'),
  provider_mode text not null default 'sandbox' check (provider_mode in ('sandbox','live')),
  amount_xof bigint not null check (amount_xof > 0),
  currency text not null default 'XOF' check (currency = 'XOF'),
  status text not null default 'pending' check (status in ('pending','verification_required','succeeded','failed','expired','refunded')),
  provider_reference text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  verified_at timestamptz
);

create index if not exists nexora_courses_status_idx on public.nexora_courses(status, created_at desc);
create index if not exists nexora_course_lessons_course_position_idx on public.nexora_course_lessons(course_id, position);
create index if not exists nexora_course_enrollments_user_idx on public.nexora_course_enrollments(user_id, created_at desc);
create index if not exists nexora_course_payment_orders_user_idx on public.nexora_course_payment_orders(user_id, created_at desc);

alter table public.nexora_courses enable row level security;
alter table public.nexora_course_lessons enable row level security;
alter table public.nexora_course_enrollments enable row level security;
alter table public.nexora_course_payment_orders enable row level security;

revoke all on public.nexora_courses from anon, authenticated;
revoke all on public.nexora_course_lessons from anon, authenticated;
revoke all on public.nexora_course_enrollments from anon, authenticated;
revoke all on public.nexora_course_payment_orders from anon, authenticated;

grant select on public.nexora_courses to authenticated;
grant select on public.nexora_course_lessons to authenticated;
grant select on public.nexora_course_enrollments to authenticated;
grant select on public.nexora_course_payment_orders to authenticated;

drop policy if exists nexora_courses_read_published on public.nexora_courses;
create policy nexora_courses_read_published on public.nexora_courses
for select to authenticated using (status = 'published' or (select private.is_admin()));

drop policy if exists nexora_course_lessons_read_published on public.nexora_course_lessons;
create policy nexora_course_lessons_read_published on public.nexora_course_lessons
for select to authenticated using (
  (is_published = true and exists (
    select 1 from public.nexora_courses c where c.id = course_id and c.status = 'published'
  ) and (is_preview = true or exists (
    select 1 from public.nexora_course_enrollments e
    where e.course_id = nexora_course_lessons.course_id
      and e.user_id = (select auth.uid()) and e.status = 'active'
  )))
  or (select private.is_admin())
);

drop policy if exists nexora_course_enrollments_read_owner_or_admin on public.nexora_course_enrollments;
create policy nexora_course_enrollments_read_owner_or_admin on public.nexora_course_enrollments
for select to authenticated using (user_id = (select auth.uid()) or (select private.is_admin()));

drop policy if exists nexora_course_payment_orders_read_owner_or_admin on public.nexora_course_payment_orders;
create policy nexora_course_payment_orders_read_owner_or_admin on public.nexora_course_payment_orders
for select to authenticated using (user_id = (select auth.uid()) or (select private.is_admin()));

-- No client-side insert/update/delete policies: trusted server code alone may create orders,
-- confirm payments, and activate enrollments. A course's price is snapshotted in its order.
