-- 00006_quiz_practice.sql — Phase 8: Quiz & Practice only.
-- Adds:
--   public.questions      (manual question bank, multiple choice only)
--   public.quiz_attempts  (practice attempts, scored server-side)
--   public.quiz_answers   (per-question answers of an attempt)
--   indexes, CHECK constraints, updated_at trigger and Row Level Security
-- Nothing else.
--
-- This phase has NO AI: no question generation, no embeddings/RAG, no
-- document parsing, no timer and no adaptive testing. Questions are authored
-- manually and the application only stores and runs the question bank.
-- Quiz scores are PRACTICE ONLY and never feed the academic grade
-- calculations (lib/exam.ts).

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  -- Optional references to the existing exam topics and materials. Only the
  -- reference is stored; course/topic/material data is never duplicated.
  exam_topic_id uuid references public.exam_topics (id) on delete set null,
  material_id uuid references public.materials (id) on delete set null,
  question text not null check (length(btrim(question)) > 0),
  option_a text not null check (length(btrim(option_a)) > 0),
  option_b text not null check (length(btrim(option_b)) > 0),
  option_c text not null check (length(btrim(option_c)) > 0),
  option_d text not null check (length(btrim(option_d)) > 0),
  correct_answer text not null check (correct_answer in ('A', 'B', 'C', 'D')),
  explanation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.questions is
  'Manually authored multiple-choice practice question. Owned by the user; belongs to a course; optionally references an existing exam topic and material (references only, no content duplication).';

comment on column public.questions.explanation is
  'Optional free-text explanation shown in the result review after submitting an attempt.';

create index questions_user_id_idx on public.questions (user_id);
create index questions_course_id_idx on public.questions (course_id);
create index questions_exam_topic_id_idx on public.questions (exam_topic_id);
create index questions_material_id_idx on public.questions (material_id);

create trigger on_questions_updated_at
  before update on public.questions
  for each row
  execute function public.set_updated_at();

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  total_questions integer not null check (total_questions > 0),
  correct_answers integer not null default 0 check (correct_answers >= 0),
  -- score = correct_answers / total_questions * 100, always computed by the
  -- server. Practice only: it is never part of the academic grade.
  score numeric not null default 0 check (score >= 0 and score <= 100),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

comment on table public.quiz_attempts is
  'Practice quiz attempt. Null completed_at means the attempt is still in progress and can be continued.';

alter table public.quiz_attempts
  add constraint quiz_attempts_correct_within_total
  check (correct_answers <= total_questions);

create index quiz_attempts_user_id_idx on public.quiz_attempts (user_id);
create index quiz_attempts_course_id_idx on public.quiz_attempts (course_id);
create index quiz_attempts_started_at_idx
  on public.quiz_attempts (started_at desc);

create table public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  -- 0-based position inside the attempt. Keeps the (randomized) question order
  -- identical in the quiz, the result and the review.
  position integer not null check (position >= 0),
  selected_answer text
    check (selected_answer is null or selected_answer in ('A', 'B', 'C', 'D')),
  -- Null until the attempt is submitted; graded by the server on submit only,
  -- so an active quiz can never leak correctness.
  is_correct boolean,
  created_at timestamptz not null default now(),
  constraint quiz_answers_attempt_position_key unique (attempt_id, position),
  constraint quiz_answers_attempt_question_key unique (attempt_id, question_id)
);

comment on table public.quiz_answers is
  'One row per question used by an attempt. selected_answer is written while the quiz runs; is_correct is only set when the attempt is submitted.';

create index quiz_answers_question_id_idx on public.quiz_answers (question_id);

-- Row Level Security: ownership plus valid course/topic/material relations
-- (same pattern as exam_topics in Phase 7).
alter table public.questions enable row level security;

create policy "users_select_own_questions"
  on public.questions for select
  using (auth.uid() = user_id);

create policy "users_insert_own_questions"
  on public.questions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.courses c
      where c.id = questions.course_id and c.user_id = auth.uid()
    )
    and (exam_topic_id is null or exists (
      select 1 from public.exam_topics t
      where t.id = questions.exam_topic_id
        and t.user_id = auth.uid()
        -- explicitly the question's course: without the qualifier the inner
        -- exam_topics.course_id would be compared with itself
        and t.course_id = questions.course_id
    ))
    and (material_id is null or exists (
      select 1 from public.materials m
      where m.id = questions.material_id
        and m.user_id = auth.uid()
        and m.course_id = questions.course_id
    ))
  );

create policy "users_update_own_questions"
  on public.questions for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.courses c
      where c.id = questions.course_id and c.user_id = auth.uid()
    )
    and (exam_topic_id is null or exists (
      select 1 from public.exam_topics t
      where t.id = questions.exam_topic_id
        and t.user_id = auth.uid()
        and t.course_id = questions.course_id
    ))
    and (material_id is null or exists (
      select 1 from public.materials m
      where m.id = questions.material_id
        and m.user_id = auth.uid()
        and m.course_id = questions.course_id
    ))
  );

create policy "users_delete_own_questions"
  on public.questions for delete
  using (auth.uid() = user_id);

alter table public.quiz_attempts enable row level security;

create policy "users_select_own_quiz_attempts"
  on public.quiz_attempts for select
  using (auth.uid() = user_id);

create policy "users_insert_own_quiz_attempts"
  on public.quiz_attempts for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.user_id = auth.uid()
    )
  );

create policy "users_update_own_quiz_attempts"
  on public.quiz_attempts for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.user_id = auth.uid()
    )
  );

create policy "users_delete_own_quiz_attempts"
  on public.quiz_attempts for delete
  using (auth.uid() = user_id);

-- Answers are owned through their attempt. Answers can only be written while
-- the attempt is still open; after submit the grades are frozen.
alter table public.quiz_answers enable row level security;

create policy "users_select_own_quiz_answers"
  on public.quiz_answers for select
  using (
    exists (
      select 1 from public.quiz_attempts a
      where a.id = attempt_id and a.user_id = auth.uid()
    )
  );

create policy "users_insert_own_quiz_answers"
  on public.quiz_answers for insert
  with check (
    exists (
      select 1 from public.quiz_attempts a
      where a.id = attempt_id
        and a.user_id = auth.uid()
        and a.completed_at is null
    )
    and exists (
      select 1 from public.questions q
      where q.id = question_id and q.user_id = auth.uid()
    )
  );

create policy "users_update_own_quiz_answers"
  on public.quiz_answers for update
  using (
    exists (
      select 1 from public.quiz_attempts a
      where a.id = attempt_id
        and a.user_id = auth.uid()
        and a.completed_at is null
    )
  )
  with check (
    exists (
      select 1 from public.quiz_attempts a
      where a.id = attempt_id
        and a.user_id = auth.uid()
        and a.completed_at is null
    )
    and exists (
      select 1 from public.questions q
      where q.id = question_id and q.user_id = auth.uid()
    )
  );

create policy "users_delete_own_quiz_answers"
  on public.quiz_answers for delete
  using (
    exists (
      select 1 from public.quiz_attempts a
      where a.id = attempt_id and a.user_id = auth.uid()
    )
  );
