-- 00003_tuton.sql — Phase 3: Tuton sessions only.
-- Creates:
--   public.tuton_sessions
--   updated_at trigger (reuses Phase 1 set_updated_at())
--   Row Level Security + ownership-through-course policies
-- Nothing else.

create table public.tuton_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  session_number smallint not null check (session_number between 1 and 8),
  title text not null check (length(btrim(title)) > 0),
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  material_label text,
  activity_label text,
  activity_type text not null default 'discussion'
    check (activity_type in ('discussion', 'assignment')),
  status text not null default 'upcoming'
    check (status in ('upcoming', 'active', 'completed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tuton_sessions_course_session_unique unique (course_id, session_number)
);

comment on table public.tuton_sessions is
  'Tuton planning/tracking session (max 8) for a course. Owned through the parent course.';

create index tuton_sessions_course_id_idx on public.tuton_sessions (course_id);

create trigger on_tuton_sessions_updated_at
  before update on public.tuton_sessions
  for each row
  execute function public.set_updated_at();

-- Row Level Security: ownership is enforced through the parent course.
alter table public.tuton_sessions enable row level security;

create policy "users_select_own_tuton_sessions"
  on public.tuton_sessions
  for select
  using (
    exists (
      select 1
      from public.courses c
      where c.id = tuton_sessions.course_id
        and c.user_id = auth.uid()
    )
  );

create policy "users_insert_own_tuton_sessions"
  on public.tuton_sessions
  for insert
  with check (
    exists (
      select 1
      from public.courses c
      where c.id = tuton_sessions.course_id
        and c.user_id = auth.uid()
    )
  );

create policy "users_update_own_tuton_sessions"
  on public.tuton_sessions
  for update
  using (
    exists (
      select 1
      from public.courses c
      where c.id = tuton_sessions.course_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.courses c
      where c.id = tuton_sessions.course_id
        and c.user_id = auth.uid()
    )
  );

create policy "users_delete_own_tuton_sessions"
  on public.tuton_sessions
  for delete
  using (
    exists (
      select 1
      from public.courses c
      where c.id = tuton_sessions.course_id
        and c.user_id = auth.uid()
    )
  );
