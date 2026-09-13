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

Authenticated: - `/dashboard` - `/courses` - `/courses/[courseId]` -
`/courses/[courseId]/tuton` - `/courses/[courseId]/materials` -
`/courses/[courseId]/notes` - `/courses/[courseId]/assignments` -
`/courses/[courseId]/discussions` - `/courses/[courseId]/exam` -
`/tuton` - `/materials` - `/notes` - `/exam`

Course page harus menyediakan navigation internal untuk subpage course.

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
-   created_at
-   updated_at

### study_topics

-   id
-   course_id
-   name
-   module_name nullable
-   mastery_score
-   created_at
-   updated_at

### questions

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

### quiz_attempts

-   id
-   user_id
-   course_id
-   score
-   total_questions
-   started_at
-   completed_at

### quiz_answers

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

Do not store a manually editable percentage unless necessary.

Exam readiness is separate and should not be treated as course progress.

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
