# Study Workspace Execution Plan

## 0. Golden Rules for Cline

Before every task: 1. Read `PROJECT.md`. 2. Read `ARCHITECTURE.md`. 3.
Read `TASKS.md`. 4. Inspect the existing implementation before changing
it. 5. Do not rewrite working code unnecessarily. 6. Do not add
dependencies unless required. 7. Do not create new architecture without
updating `ARCHITECTURE.md`. 8. After implementation, run the relevant
checks. 9. Update `TASKS.md`. 10. Report files changed, checks run, and
remaining issues.

If a task conflicts with these documents, stop and explain the conflict
before making a large architectural change.

## 1. Development Phases

### Phase 1: Foundation + Auth

-   [x] Initialize Next.js + TypeScript.
-   [x] Configure Tailwind/shadcn if used.
-   [x] Configure Supabase.
-   [x] Configure auth.
-   [x] Create database migrations.
-   [x] Enable RLS.
-   [x] Build app shell.
-   [x] Build sidebar.
-   [x] Build responsive layout.

Acceptance: - App runs locally. - Login works. - Authenticated layout
works. - Database connection works. - RLS is active.

### Phase 2: Courses

-   [x] Course CRUD.
-   [x] Course list.
-   [x] Course overview.
-   [x] Course navigation.
-   [x] Empty states.

Acceptance: - User can create, edit, delete, and open a course. - Course
data persists after refresh.

### Phase 3: Tuton

-   [x] Tuton session CRUD.
-   [x] Session timeline.
-   [x] Activity status.
-   [x] Deadline display.
-   [x] Overall Tuton progress.
-   [x] Seed the 8-session schedule from the supplied 2026/2027 Tuton
    schedule.

Seed schedule:

Session 1: 14 Sep 2026 - 20 Sep 2026 Material Inisiasi 1 + Diskusi 1

Session 2: 21 Sep 2026 - 27 Sep 2026 Material Inisiasi 2 + Diskusi 2

Session 3: 28 Sep 2026 - 12 Oct 2026 Material Inisiasi 3 + Tugas 1

Session 4: 5 Oct 2026 - 11 Oct 2026 Material Inisiasi 4 + Diskusi 4

Session 5: 12 Oct 2026 - 26 Oct 2026 Material Inisiasi 5 + Tugas 2

Session 6: 19 Oct 2026 - 25 Oct 2026 Material Inisiasi 6 + Diskusi 6

Session 7: 26 Oct 2026 - 9 Nov 2026 Material Inisiasi 7 + Tugas 3

Session 8: 2 Nov 2026 - 8 Nov 2026 Material Inisiasi 8 + Diskusi 8

Important: - Keep the exact supplied dates. - Do not normalize
overlapping dates. - Do not assume every session is exactly 7 days.

### Phase 4: Materials, Notes, Assignments, Discussions

-   [x] Materials CRUD.
-   [x] Notes CRUD.
-   [x] Assignments CRUD.
-   [x] Discussions CRUD.
-   [x] Search/filter.
-   [x] File upload.
-   [x] Course-specific organization.

Acceptance: User can use the app as a real semester workspace without
AI.

### Phase 5: Dashboard

-   [x] Course progress cards.
-   [x] Tuton progress.
-   [x] Upcoming deadlines.
-   [x] Recent activity.
-   [x] Quick actions.
-   [x] Empty states.

Acceptance: - Dashboard shows real RLS-scoped Supabase data. - Course
progress uses Tuton 50% / Assignments 25% / Discussions 25% with
zero-item categories handled safely. - Sections degrade gracefully when
any category is empty.

### Phase 6: Study Planner / Study Schedule

-   [x] `/planner` route in the dashboard shell with sidebar entry.
-   [x] Today view (priorities derived from existing data).
-   [x] Upcoming view.
-   [x] Weekly overview (Mon–Sun buckets, prev/next week navigation).
-   [x] Deterministic priority model (high/medium/low).
-   [x] Course filter (URL param, reuses existing course records).
-   [x] Statuses read from existing entities (no duplicate completion state).
-   [x] Material review items labeled as deadline-free study items.
-   [x] Empty states (no courses, no items today, no upcoming, filtered).

Acceptance: - Planner derives everything from courses, tuton_sessions,
assignments, discussions, and materials. No new migration, no new
completion state, no AI, no calendar integration. - Week navigation and
course filter work through URL params with plain Links. - Today is
computed in Asia/Jakarta via Intl to avoid UTC date shifts.

### Phase 7: Exam Preparation

-   [x] `/exam` exam preparation workspace with course filter
    (`?course=` URL param; All Courses / single course).
-   [x] Manual score recording on existing Discussions and Assignments
    (score, score_max, feedback, score_recorded_at) — migration 00005.
-   [x] Individual scores stay visible; averages computed from recorded
    scores only (missing scores never counted as zero).
-   [x] Tuton score: Kehadiran 20% (default 100) + Diskusi average 30% +
    Tugas average 50%; labeled "estimated" while items are ungraded.
-   [x] UAS score entry per course (0–100, courses.uas_score).
-   [x] Final course score: Tuton 30% + UAS 70%; "Awaiting UAS" when UAS
    is not entered.
-   [x] What-if UAS calculator with required > 100 and <= 0 handling.
-   [x] Exam preparation topics (exam_topics) CRUD with status
    (not_started/in_progress/completed) and optional material reference.
-   [x] Preparation progress = completed topics / total topics with
    zero-topic safety and the existing ProgressBar.
-   [x] Empty states: no courses, no topics, no Discussion scores, no
    Assignment scores, UAS not entered.
-   [x] RLS on exam_topics + ownership enforcement on all score writes.

Acceptance: - `/exam` shows per-course academic summary (Tuton / UAS /
Final), preparation progress, topics, Tuton scores, and the what-if
calculator. - Dashboard workspace progress (Tuton 50% / Assignments 25%
/ Discussions 25%) is untouched. - No quiz engine, no AI, no analytics.

### Phase 8: Quiz & Practice

-   [x] `/quiz` landing page in the dashboard shell with a sidebar entry
    (Question Bank / Practice Quiz / Quiz History).
-   [x] Manual question bank (`questions`, multiple choice A–D only) with
    create/edit/delete/view, search + course filter, and optional exam
    topic/material references (references only — no data duplication).
-   [x] Server-side validation of course/topic/material ownership and of
    cross-course links, plus RLS on `questions`.
-   [x] Practice quiz setup (course required, question count, optional exam
    topic/material) with an availability preview.
-   [x] Quiz attempts (`quiz_attempts` + `quiz_answers`, migration 00006):
    the attempt and its questions are stored before answering starts,
    questions are picked server-side in random order, and fewer available
    questions than requested is not an error.
-   [x] Quiz runner: next/previous, question navigator, answer review before
    submit, per-answer persistence, submit confirmation when questions are
    unanswered (no timer).
-   [x] Server-side scoring only: `score = correct_count / total_questions ×
    100`; unanswered questions count as incorrect; the client never supplies
    the score; empty attempts are refused.
-   [x] Quiz results: score, correct/total, percentage, status, timestamps and
    per-question review (selected answer, correct answer, explanation).
-   [x] No correct-answer leakage during an active quiz (`is_correct` stays
    null until submit; the runner page never selects `correct_answer` or
    `explanation`).
-   [x] Quiz history (`/quiz/attempts`) with a course filter and
    in-progress/completed state; `/quiz/attempts/[attemptId]` opens the
    result review.
-   [x] RLS on questions/quiz_attempts/quiz_answers, including the
    attempt-ownership chain for answers and "no writes after submit".
-   [ ] Study topics (question-level mastery) — deferred to Phase 9.
-   [ ] Weak-topic calculation — deferred to Phase 9.
-   [ ] Practice exam mode — deferred to Phase 9.

Acceptance: - Questions can be created, edited, filtered and deleted manually;
practice quizzes can be started, answered, left/resumed and submitted; the
result and its review are calculated by the server. - Quiz scores are practice
only: Tuton/UAS/final scores and `lib/exam.ts` are untouched. - Zero AI: no
question generation, no LLM, no embeddings/RAG, no document parsing, no timer
and no adaptive algorithm.

### Phase 9: Study Analytics & Progress

-   [x] `/analytics` route in the dashboard shell with an Analytics sidebar
    entry (after Planner) and one Dashboard quick-action link.
-   [x] Overall study progress: courses, Tuton %, assignment %, discussion %,
    exam topic preparation %, question bank size, quiz attempts and average
    quiz score.
-   [x] Course progress per course (same categories plus question count,
    attempt count and average/latest quiz score), with the existing Phase 7
    academic scores re-displayed from `lib/exam.ts` (no new grade formula).
-   [x] Tuton analytics: total / completed / active / upcoming / past end date
    (derived, status unchanged) / completion %, plus a per-course breakdown.
-   [x] Assignment and discussion analytics: total, completed, incomplete,
    derived overdue and completion %, per category.
-   [x] Exam preparation analytics: total / completed / in progress / not
    started / preparation %, plus per-course academic scores with
    "Incomplete" / "Not available" / "Awaiting UAS" labels instead of invented
    values.
-   [x] Quiz analytics: question bank size, questions per course, attempts,
    completed attempts, average / best / latest score (completed attempts
    only), per-course question/attempt/score breakdown. No mastery, no
    weak-topic detection, no readiness claim.
-   [x] Study activity: recorded activity counts for the last 7 and 30 days
    from existing `created_at`/`updated_at` timestamps, with a 7-day CSS/Tailwind
    bar chart (no chart dependency) — labeled as activity, never study hours.
-   [x] Progress trend: current-state metrics only; the page states explicitly
    that no historical snapshots exist, so no fabricated trend is drawn.
-   [x] Deterministic insights (restatements of the metrics); no prediction and
    no AI-style recommendations.
-   [x] Course filter via `?course=` (All Courses / single course) scoping every
    metric, with URL-param navigation.
-   [x] Empty states per data source ("No Tuton data", "No assignment data",
    "No discussion data", "No exam preparation data", "No question bank data",
    "No recorded activity") and "No data" instead of misleading 0%.
-   [x] No migration: every metric is derived from the existing schema.
-   [ ] Historical grade charts / long-term trend lines — deferred: the schema
    stores no historical snapshots, so any curve would be fabricated. Only
    current-state metrics are shown.
-   [ ] Study streaks — deferred: no daily rollup is stored, and streaks are a
    gamification feature outside Phase 9 scope.

Acceptance: - `/analytics` shows overall, per-course, Tuton, deadline, exam
preparation, quiz and activity metrics plus deterministic insights, filtered by
`?course=`. - Every number is derived from existing tables with pure functions
in `lib/analytics.ts`; no analytics/activity-tracking table and no migration
were added. - Overdue/past-deadline and Tuton active/upcoming buckets are
derived only; no stored status is mutated. - Academic scores come from
`lib/exam.ts` and are unchanged; quiz scores stay practice-only. - Zero AI, no
new dependency, no Dashboard redesign.

### Phase 10: Polish / UX / Deployment

-   [ ] Responsive audit.
-   [ ] Accessibility basics.
-   [ ] Loading states.
-   [ ] Error states.
-   [ ] Empty states.
-   [ ] Form validation.
-   [ ] Security review.
-   [ ] Production build.
-   [ ] Vercel deployment.

## 2. Current Task

CURRENT_PHASE: Phase 9

CURRENT_TASK: Phase 9 — Study Analytics & Progress is implemented and validated
(typecheck, lint, build pass; analytics metric logic verified with executed
assertions). `/analytics` is a protected dashboard-shell route (Analytics
sidebar entry after Planner, plus one Dashboard quick-action link) with a
`?course=` filter. It shows overall study progress, per-course progress, Tuton
metrics (total/completed/active/upcoming/derived past-end-date), assignment and
discussion metrics (total/completed/incomplete/derived overdue), exam topic
metrics plus the existing Phase 7 academic scores from lib/exam.ts, quiz
metrics (completed attempts only: average/best/latest), recorded activity for
the last 7/30 days with a 7-day Tailwind bar chart, an explicit
no-historical-snapshot trend note, and deterministic insights. All metrics are
computed by pure functions in `lib/analytics.ts` from RLS-scoped reads with only
the needed columns; no migration, no analytics table, no AI, no chart
dependency, no status mutation and no Dashboard redesign. Deferred: historical
grade charts/trends (no snapshot data) and streaks (out of scope). Phase 10
must not start without explicit instruction.

## 3. Definition of Done

A task is complete only when: - It works. - It persists data when
persistence is relevant. - TypeScript has no relevant errors. -
Lint/build passes where configured. - UI has loading/error/empty states
where relevant. - No secrets are exposed. - Documentation is updated if
architecture changes.

## 4. Cline Response Format

At the end of each task, respond with:

``` text
IMPLEMENTED
- ...

FILES CHANGED
- ...

CHECKS
- ...

ISSUES
- ...

NEXT TASK
- ...
```

Keep responses concise.
