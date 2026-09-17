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

-   [ ] Study topics (question-level mastery).
-   [ ] Question bank.
-   [ ] Quiz attempts.
-   [ ] Quiz results.
-   [ ] Weak-topic calculation.
-   [ ] Practice exam.

Do not start without explicit instruction.

### Phase 9: Study Analytics & Progress

-   [ ] Historical grade charts.
-   [ ] Long-term performance trends.
-   [ ] Study streaks.
-   [ ] Advanced analytics dashboard.

Do not start without explicit instruction.

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

CURRENT_PHASE: Phase 7

CURRENT_TASK: Phase 7 — Exam Preparation is implemented and validated
(typecheck, lint, build pass). `/exam` is an exam preparation and
grade-tracking workspace: per-course academic summary (Tuton 30% + UAS
70%; inside Tuton Kehadiran 20% + Diskusi 30% + Tugas 50%), manual
score recording on existing assignments/discussions (migration 00005
adds score fields and the exam_topics table), UAS entry, final course
score, what-if UAS calculator, study topics with optional material
references, and preparation progress. Missing scores are never treated
as zero. No AI, no quiz engine, no analytics. Phase 8 (Quiz & Practice)
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
