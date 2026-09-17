# Study Workspace Architecture

## 1. Stack

Frontend: - Next.js - React - TypeScript - Tailwind CSS - shadcn/ui bila
diperlukan

Backend: - Next.js Server Actions / Route Handlers - Supabase

Database: - PostgreSQL via Supabase

Auth: - Supabase Auth

Storage: - Supabase Storage

AI: - Provider abstraction. - Default provider configured through
environment variables. - Gemini/OpenRouter/local provider dapat ditukar
tanpa mengubah UI.

Deployment: - Vercel - GitHub

## 2. Project Structure

Gunakan struktur sederhana. Jangan membuat folder berlebihan.

``` text
app/
  (dashboard)/
    dashboard/
    courses/
    tuton/
    materials/
    notes/
    exam/
  api/
  auth/
  layout.tsx
  page.tsx

components/
  ui/
  shared/
  courses/
  tuton/
  study/

lib/
  supabase/
  ai/
  db/
  utils/

types/
  database.ts

supabase/
  migrations/

public/
```

Jangan membuat file hanya demi memecah file. Component hanya dipisah
jika reusable atau sudah terlalu besar.

## 3. Main Routes

Public: - `/` - `/login`

Authenticated: - `/dashboard` - `/planner` - `/courses` -
`/courses/[courseId]` - `/courses/[courseId]/tuton` -
`/courses/[courseId]/materials` - `/courses/[courseId]/notes` -
`/courses/[courseId]/assignments` - `/courses/[courseId]/discussions` -
`/courses/[courseId]/exam` - `/tuton` - `/materials` - `/notes` -
`/exam` - `/quiz` - `/quiz/questions` - `/quiz/practice` -
`/quiz/practice/[attemptId]` - `/quiz/attempts` -
`/quiz/attempts/[attemptId]`

Course page harus menyediakan navigation internal untuk subpage course.

The Study Planner (`/planner`, derived view):

-   Pure derived view over existing tables (courses, tuton_sessions,
    assignments, discussions, materials). No `study_tasks` table, no new
    completion state, no calendar integration.
-   Statuses are read from the owning entity (assignments, discussions,
    tuton_sessions). Completed items are excluded from active priorities.
-   Deterministic priority: high = overdue/due ≤ 3 days or active Tuton
    ending ≤ 3 days; medium = later deadlines, upcoming Tuton ≤ 7 days;
    low = material review (materials have no deadline semantics and are
    always labeled as review).
-   "Today" is computed in Asia/Jakarta via `Intl.DateTimeFormat`
    (`lib/planner.ts`) so UTC server time cannot shift the displayed
    date. Week navigation (Mon-based) uses plain JS date math via URL
    params (`?week=`, `?course=`) — no date library.

The Exam Preparation workspace (`/exam`, Phase 7):

-   Pure study preparation and manual grade tracking. No quiz engine in
    Phase 7; the quiz lives in Phase 8 (see below).
-   Academic grade model (a DIFFERENT system from the Dashboard
    workspace progress in section 8):
    `Final = Tuton × 0.30 + UAS × 0.70`, and inside the Tuton
    component: `Tuton = Kehadiran × 0.20 + Diskusi × 0.30 + Tugas × 0.50`
    (0–100 scale; Kehadiran uses the fixed default 100 when the user
    participates in Tuton).
-   Discussion/Assignment scores are recorded manually on the existing
    entities (`score`, `score_max`, `feedback`, `score_recorded_at`).
    Missing scores are never treated as zero: averages use recorded
    scores only, and incomplete Tuton/Final calculations are labeled
    "estimated" or "awaiting".
-   UAS is stored on `courses.uas_score` (0–100; null = "Awaiting UAS";
    missing UAS is never treated as zero).
-   Study topics live in `exam_topics` (status not_started/in_progress/
    completed, optional `material_id` reference to existing materials —
    reference only, no content duplication; topic links navigate to the
    existing material route).
-   Preparation progress = completed topics / total topics × 100, with
    zero-topic safety (0%, never NaN/Infinity).
-   Course filter via the `?course=` URL param; data is grouped per
    course and never mixed. `/courses/[courseId]/exam` redirects to
    `/exam?course=[courseId]`.
-   The what-if UAS calculator is pure deterministic math
    (`Required UAS = (Target − Tuton × 0.30) / 0.70`) with explicit
    handling for required > 100 and <= 0. It does not predict results.

The Quiz & Practice workspace (`/quiz`, Phase 8):

-   Manual question bank only: questions are authored by the user (or by an
    assistant outside the application) and entered through the UI. There is
    ZERO AI in this phase — no question generation, no LLM call, no
    embeddings/RAG, no PDF/DOCX parsing, no scraping, no timer and no
    adaptive/weak-topic algorithm.
-   Question type is multiple choice only (A/B/C/D); `correct_answer` is
    constrained to A, B, C or D in the database. An optional `explanation`
    is shown in the review after submitting.
-   A question always belongs to a course and may reference an existing
    `exam_topics` row and/or an existing `materials` row (references only —
    no course/topic/material data is duplicated, and the referenced file is
    never read or parsed).
-   Intended external workflow: material/module/notes/assignment/discussion
    → user or assistant reads the source → question authored manually →
    question entered into the question bank → practice quiz. The official
    module/material is the primary factual source; student-authored
    assignment/discussion/notes content is study context only and is never
    treated as authoritative by the application.
-   Practice flow: `/quiz/practice` (course required, question count,
    optional exam topic/material) creates a `quiz_attempts` row plus one
    `quiz_answers` row per selected question before answering starts.
    Questions are selected server-side in random order (Fisher–Yates, no
    adaptive algorithm) and capped at the requested count. Fewer available
    questions is never an error — the attempt uses what exists and the UI
    says so; an empty selection is refused, so no empty attempt is created.
-   Answers are persisted per question through a server action while the
    attempt is open (leave/resume is therefore safe). `is_correct` stays
    null until submit: an active quiz never receives correctness, and the
    active-quiz page never selects `correct_answer` or `explanation`.
-   Scoring is server-side only: on submit the server grades every stored
    answer against the stored `correct_answer`, sets `is_correct`, and stores
    `correct_answers`, `total_questions`, `score` and `completed_at`.
    `score = correct_answers / total_questions × 100`. Unanswered questions
    count as incorrect; a client-provided score is never trusted.
-   `/quiz/practice/[attemptId]` is the runner (next/previous, question
    navigator, answer review, submit confirmation) and redirects to the
    result page once submitted; `/quiz/attempts/[attemptId]` shows the score
    summary and the per-question review (selected answer, correct answer,
    explanation) and redirects back to the runner while an attempt is still
    open. `/quiz/attempts` is a simple history list (date, course, totals,
    score, completed/in-progress) with a `?course=` filter, limited to 100
    rows. No analytics here — that is Phase 9.
-   Quiz scores are PRACTICE ONLY. They are never mixed with Tuton, UAS or
    the final course score, and `lib/exam.ts` is untouched by this phase.
-   If a question is deleted, its answer rows are removed with it (cascade);
    the attempt keeps its stored totals and score, and the result page notes
    that some questions can no longer be reviewed.

## 4. Database

### profiles

-   id
-   display_name
-   created_at
-   updated_at

### courses

-   id
-   user_id
-   code
-   name
-   description
-   semester
-   color/icon optional
-   uas_score nullable (0–100; null = UAS not entered yet) — Phase 7
-   created_at
-   updated_at

### tuton_sessions

-   id
-   course_id
-   session_number
-   title
-   start_date
-   end_date
-   activity_type
-   status
-   created_at
-   updated_at

activity_type: - discussion - assignment

### materials

-   id
-   course_id
-   user_id
-   session_id nullable
-   title
-   module_name
-   topic
-   content
-   source
-   file_path nullable
-   created_at
-   updated_at

### notes

-   id
-   user_id
-   course_id nullable
-   material_id nullable
-   title
-   content
-   created_at
-   updated_at

### assignments

-   id
-   course_id
-   user_id
-   session_id nullable
-   title
-   description
-   deadline
-   status
-   external_url nullable
-   file_path nullable
-   score nullable (manually recorded tutor/lecturer grade) — Phase 7
-   score_max nullable (defaults to 100 when absent) — Phase 7
-   feedback nullable — Phase 7
-   score_recorded_at nullable — Phase 7
-   created_at
-   updated_at

### discussions

-   id
-   course_id
-   user_id
-   session_id nullable
-   title
-   deadline
-   external_url nullable
-   response_text nullable
-   status
-   score nullable (manually recorded tutor/lecturer grade) — Phase 7
-   score_max nullable (defaults to 100 when absent) — Phase 7
-   feedback nullable — Phase 7
-   score_recorded_at nullable — Phase 7
-   created_at
-   updated_at

### exam_topics

-   id
-   user_id
-   course_id
-   material_id nullable (reference to an existing material; no content
    duplication)
-   title
-   description nullable
-   status (not_started | in_progress | completed)
-   notes nullable
-   created_at
-   updated_at

### questions (Phase 8)

-   id
-   user_id
-   course_id
-   exam_topic_id nullable (reference to an existing exam topic)
-   material_id nullable (reference to an existing material)
-   question
-   option_a / option_b / option_c / option_d
-   correct_answer ('A' | 'B' | 'C' | 'D')
-   explanation nullable
-   created_at
-   updated_at

### quiz_attempts (Phase 8)

-   id
-   user_id
-   course_id
-   total_questions (> 0; fixed when the attempt is submitted)
-   correct_answers (<= total_questions)
-   score numeric 0–100 (`correct_answers / total_questions × 100`)
-   started_at
-   completed_at nullable (null = still in progress and resumable)

### quiz_answers (Phase 8)

-   id
-   attempt_id
-   question_id
-   position (0-based; unique per attempt, keeps the order stable)
-   selected_answer nullable ('A' | 'B' | 'C' | 'D')
-   is_correct nullable (null until the attempt is submitted)
-   created_at

A question and its answers are unique per attempt
(`unique (attempt_id, question_id)` and `unique (attempt_id, position)`).

The following are planned for later phases and not implemented yet:

### study_topics (planned, later phase)

-   id
-   course_id
-   name
-   module_name nullable
-   mastery_score
-   created_at
-   updated_at

Question-level mastery / weak-topic calculation and practice-exam mode are
deliberately NOT part of Phase 8; Phase 9 (Study Analytics) owns that.

## 5. Relationships

``` text
profiles
  |
  +-- courses
       |
       +-- tuton_sessions
       |     |
       |     +-- assignments
       |     +-- discussions
       |
       +-- materials
       |     |
       |     +-- notes
       |
       +-- exam_topics
       |
       +-- questions        (optional exam_topic_id)
       |     |              (optional material_id)
       |     |
       |     +-- quiz_answers
       |
       +-- quiz_attempts
             |
             +-- quiz_answers
```

## 6. Security

Every user-owned table must enforce Supabase Row Level Security.

Rule: user can only read/write records connected to their own `user_id`.

For course-owned records without direct user_id, enforce ownership
through the course relationship.

Never trust a client-provided user_id.

Quiz & Practice (Phase 8) ownership chain:

-   `questions` — owner-only select/insert/update/delete; insert/update also
    require the course to be the user's own and, when set, the exam topic and
    material to be the user's own AND to belong to that same course
    (cross-course links are refused at the database level).
-   `quiz_attempts` — owner-only; insert/update also require the course to
    belong to the user.
-   `quiz_answers` — owned through the attempt: every policy checks that the
    referenced attempt belongs to the user. Insert/update additionally
    require the attempt to be open (`completed_at is null`) and the question
    to be the user's own, so answers can never be added or changed after
    submission.
-   Correctness is never sent to the client while a quiz is active
    (`is_correct` stays null until submit, and the runner page does not
    select `correct_answer`/`explanation`), and the attempt score is always
    computed server-side from stored data.
-   Known limitation (not solved by RLS): a signed-in owner could update
    their own attempt row directly through PostgREST and change the stored
    score. RLS is row-level, not column-level; hardening this would need a
    SECURITY DEFINER scoring function plus revoked column privileges.
    Out of scope for Phase 8.

## 7. AI Architecture

Use one internal interface.

Concept:

``` text
AIService
  -> generateText()
  -> summarize()
  -> generateQuiz()
  -> explainAnswer()
```

Provider implementation:

``` text
AIService
  |
  +-- GeminiProvider
  +-- OpenRouterProvider
  +-- LocalProvider optional
```

Only server-side code can access AI API keys.

AI context flow:

``` text
User request
    |
    v
Identify course/topic
    |
    v
Retrieve relevant materials
    |
    v
Build bounded context
    |
    v
AI provider
    |
    v
Structured response
    |
    v
Save result when useful
```

Quiz generation must request structured JSON and validate the response
before saving.

Phase 8 (Quiz & Practice) note: that workspace contains ZERO AI. Questions are
authored manually and the application only stores and runs the question bank;
reading a material and writing questions happens outside the application.
Nothing in Phase 8 depends on `AI_PROVIDER`/`AI_API_KEY`, and no AI SDK,
embedding, vector store, RAG pipeline or question-generation endpoint exists in
the codebase.

## 8. Progress

Course progress is derived from actual records.

Initial formula: - Tuton completion: 50% - Assignments: 25% -
Discussions: 25%

A category with no records (e.g. a course without Tuton sessions,
assignments, or discussions) contributes 0% to the formula; weights are
never renormalized. Division by zero is handled in code so progress can
never be NaN/Infinity.

Do not store a manually editable percentage unless necessary.

Exam readiness is separate and should not be treated as course progress.

Phase 7 note: the academic GRADE (Exam Preparation) is a separate system
from the workspace progress above. Final course score =
(Tuton score × 30%) + (UAS score × 70%), where the Tuton score itself =
(Kehadiran 100 × 20%) + (Diskusi average × 30%) + (Tugas average × 50%).
The Dashboard 50/25/25 formula is not modified by Phase 7.

Initial exam readiness can use: - topic mastery - quiz scores -
completed practice exams

Keep formula simple and configurable.

Phase 8 note: no readiness, mastery or weak-topic calculation is implemented.
Quiz scores are stored for practice and review only and are intentionally NOT
fed into any readiness or grade formula.

## 9. File Handling

Store files in Supabase Storage.

Database stores only: - file_path - file metadata if needed

Do not store large binary files directly in PostgreSQL.

V1 accepted: - PDF - DOCX - TXT

If parsing is not implemented yet, allow upload and manual text input.
AI should only process extracted text, not assume it can read an
arbitrary stored file.

Phase 8 note: the Quiz & Practice workspace does not touch files at all. A
question only stores an optional `material_id` reference; the material file is
never read, parsed, downloaded or scraped, and no PDF/DOCX/TXT parser exists.

FUTURE / OUT OF SCOPE (documentation only): if large material files ever become
a problem for Supabase Storage, a user-side local file reference could be
introduced in a later phase. That is explicitly NOT part of Phase 8 — no local
filesystem dependency, no new upload pipeline, and no refactor of the existing
Phase 4 storage flow.

## 10. Environment Variables

Required pattern:

``` env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

AI_PROVIDER=gemini
AI_MODEL=
AI_API_KEY=
```

Never commit `.env`.

## 11. Error Handling

Every async operation needs: - loading state - success feedback - error
feedback - retry where appropriate

AI errors must be human-readable: - quota exceeded - provider
unavailable - invalid response - timeout

Do not expose raw provider secrets or internal stack traces.

## 12. Design Constraint

Prefer: - server components where appropriate - server actions for
mutations - small client components only where interaction requires them

Avoid unnecessary global state.

Use URL params for navigation state when practical.
