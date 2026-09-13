-- 00002_courses.sql — Phase 2: Courses only.
-- Creates:
--   public.courses
--   updated_at trigger (reuses Phase 1 set_updated_at())
--   Row Level Security + own-row policies
-- Nothing else (tuton, materials, notes, assignments, discussions, exam
-- tables come in later phases).

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  semester text,
  color text,
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.courses is
  'Academic course. Owned by the authenticated user via user_id.';

create index courses_user_id_idx on public.courses (user_id);

create trigger on_courses_updated_at
  before update on public.courses
  for each row
  execute function public.set_updated_at();

-- Row Level Security: users may only access their own courses.
alter table public.courses enable row level security;

create policy "users_select_own_courses"
  on public.courses
  for select
  using (auth.uid() = user_id);

create policy "users_insert_own_courses"
  on public.courses
  for insert
  with check (auth.uid() = user_id);

create policy "users_update_own_courses"
  on public.courses
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users_delete_own_courses"
  on public.courses
  for delete
  using (auth.uid() = user_id);
