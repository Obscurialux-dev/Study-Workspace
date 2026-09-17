-- 00005_exam_preparation.sql — Phase 7: Exam Preparation only.
-- Adds:
--   score fields on assignments and discussions (manual tutor/lecturer grades)
--   uas_score on courses
--   public.exam_topics
--   updated_at trigger + Row Level Security for exam_topics
-- Nothing else.

-- Manual recorded scores (from the tutor/lecturer) on existing entities.
alter table public.assignments
  add column score numeric check (score is null or score >= 0),
  add column score_max numeric check (score_max is null or score_max > 0),
  add column feedback text,
  add column score_recorded_at timestamptz;

alter table public.assignments
  add constraint assignments_score_within_max
  check (score is null or score_max is null or score <= score_max);

alter table public.discussions
  add column score numeric check (score is null or score >= 0),
  add column score_max numeric check (score_max is null or score_max > 0),
  add column feedback text,
  add column score_recorded_at timestamptz;

alter table public.discussions
  add constraint discussions_score_within_max
  check (score is null or score_max is null or score <= score_max);

comment on column public.assignments.score is
  'Manually recorded tutor/lecturer grade. Null = not graded yet.';
comment on column public.discussions.score is
  'Manually recorded tutor/lecturer grade. Null = not graded yet.';

-- UAS score for the final course score calculation (fixed 0–100 scale).
alter table public.courses
  add column uas_score numeric check (uas_score is null or (uas_score >= 0 and uas_score <= 100));

comment on column public.courses.uas_score is
  'Manually recorded UAS score (0–100). Null = UAS not taken/entered yet.';

-- Exam preparation study topics per course.
create table public.exam_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  material_id uuid references public.materials (id) on delete set null,
  title text not null check (length(btrim(title)) > 0),
  description text,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.exam_topics is
  'Exam preparation study topic. Owned by the user; belongs to a course; optionally references an existing material.';

create index exam_topics_user_id_idx on public.exam_topics (user_id);
create index exam_topics_course_id_idx on public.exam_topics (course_id);

create trigger on_exam_topics_updated_at
  before update on public.exam_topics
  for each row
  execute function public.set_updated_at();

-- Row Level Security: ownership plus valid course/material relationships
-- (same pattern as notes in Phase 4).
alter table public.exam_topics enable row level security;

create policy "users_select_own_exam_topics"
  on public.exam_topics for select
  using (auth.uid() = user_id);

create policy "users_insert_own_exam_topics"
  on public.exam_topics for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.user_id = auth.uid()
    )
    and (material_id is null or exists (
      select 1 from public.materials m
      where m.id = material_id and m.user_id = auth.uid()
    ))
  );

create policy "users_update_own_exam_topics"
  on public.exam_topics for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.user_id = auth.uid()
    )
    and (material_id is null or exists (
      select 1 from public.materials m
      where m.id = material_id and m.user_id = auth.uid()
    ))
  );

create policy "users_delete_own_exam_topics"
  on public.exam_topics for delete
  using (auth.uid() = user_id);