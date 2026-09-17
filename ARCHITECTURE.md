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
`/exam`

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

-   Pure study preparation and manual grade tracking. No quiz engine,
    no automated grading, no AI. Phase 8 (Quiz & Practice) comes later.
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

The following are planned for later phases and not implemented yet:

### study_topics (planned, Phase 8)

-   id
-   course_id
-   name
-   module_name nullable
-   mastery_score
-   created_at
-   updated_at

### questions (planned, Phase 8)

-   id
-   course_id
-   topic_id nullable
-   material_id nullable
-   question
-   options JSON nullable
-   answer
-   explanation
-   difficulty
-   source_type
-   created_at

### quiz_attempts (planned, Phase 8)

-   id
-   user_id
-   course_id
-   score
-   total_questions
-   started_at
-   completed_at

### quiz_answers (planned, Phase 8)

-   id
-   attempt_id
-   question_id
-   user_answer
-   is_correct
-   created_at

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
       +-- study_topics
       |     |
       |     +-- questions
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

## 9. File Handling

Store files in Supabase Storage.

Database stores only: - file_path - file metadata if needed

Do not store large binary files directly in PostgreSQL.

V1 accepted: - PDF - DOCX - TXT

If parsing is not implemented yet, allow upload and manual text input.
AI should only process extracted text, not assume it can read an
arbitrary stored file.

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
