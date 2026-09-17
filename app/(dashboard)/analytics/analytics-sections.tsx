import type { ReactNode } from "react";

import { ProgressBar } from "@/components/ui/progress-bar";
import {
  percentLabel,
  type AcademicMetrics,
  type ActivitySummary,
  type CompletionMetric,
  type CourseAnalytics,
  type DeadlineMetrics,
  type OverallAnalytics,
  type QuizMetrics,
  type TopicMetrics,
  type TutonMetrics,
} from "@/lib/analytics";
import {
  TUTON_COMPONENT_WEIGHT,
  UAS_COMPONENT_WEIGHT,
  formatScore,
} from "@/lib/exam";

const cardClasses = "rounded-lg border border-slate-200 bg-white p-5 shadow-sm";
const sectionTitleClasses =
  "text-sm font-semibold uppercase tracking-wide text-slate-500";
const tileLabelClasses =
  "text-xs font-medium uppercase tracking-wide text-slate-500";
const tileValueClasses =
  "mt-1 text-xl font-semibold tracking-tight text-slate-900";

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className={cardClasses}>
      <h2 className={sectionTitleClasses}>{title}</h2>
      {note ? <p className="mt-1 text-xs text-slate-500">{note}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** One metric value. Percentages without data read “No data”, never 0%. */
function MetricTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className={tileLabelClasses}>{label}</p>
      <p className={tileValueClasses}>{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
    </div>
  );
}

/** Label + progress bar + counts, with “No data” instead of a fake 0%. */
function ProgressRow({
  label,
  metric,
  detail,
}: {
  label: string;
  metric: CompletionMetric;
  detail?: string;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-sm font-semibold text-slate-900">
          {metric.percent === null ? "No data" : percentLabel(metric.percent)}
        </p>
      </div>
      <ProgressBar value={metric.percent ?? 0} className="mt-1.5" />
      <p className="mt-1 text-xs text-slate-500">
        {metric.total === 0
          ? "No records yet"
          : `${metric.completed} of ${metric.total} completed${
              detail ? ` · ${detail}` : ""
            }`}
      </p>
    </div>
  );
}

function NoDataNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
      {children}
    </p>
  );
}

/** Missing academic data is labeled, never turned into an invented score. */
function finalScoreLabel(academic: AcademicMetrics): string {
  if (academic.finalScore !== null) return formatScore(academic.finalScore);
  if (academic.tutonScore !== null && academic.uasScore === null) {
    return "Awaiting UAS";
  }
  return "Incomplete";
}

/* --------------------------------- overview -------------------------------- */

export function OverviewSection({ overall }: { overall: OverallAnalytics }) {
  return (
    <Section
      title="Overall study progress"
      note="Aggregated from the records already stored in your workspace. Percentages without underlying records are shown as “No data”, not 0%."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <MetricTile label="Courses" value={String(overall.courseCount)} />
        <MetricTile
          label="Tuton completion"
          value={percentLabel(overall.tuton.percent)}
          detail={`${overall.tuton.completed} of ${overall.tuton.total} sessions`}
        />
        <MetricTile
          label="Assignment completion"
          value={percentLabel(overall.assignments.percent)}
          detail={`${overall.assignments.completed} of ${overall.assignments.total} assignments`}
        />
        <MetricTile
          label="Discussion completion"
          value={percentLabel(overall.discussions.percent)}
          detail={`${overall.discussions.completed} of ${overall.discussions.total} discussions`}
        />
        <MetricTile
          label="Exam topic preparation"
          value={percentLabel(overall.topics.percent)}
          detail={`${overall.topics.completed} of ${overall.topics.total} topics`}
        />
        <MetricTile
          label="Question bank"
          value={String(overall.questionCount)}
          detail="Manually authored questions"
        />
        <MetricTile
          label="Quiz attempts"
          value={String(overall.quiz.attempts)}
          detail={`${overall.quiz.completedAttempts} completed`}
        />
        <MetricTile
          label="Average quiz score"
          value={percentLabel(overall.quiz.averageScore)}
          detail="Completed attempts only"
        />
      </div>
    </Section>
  );
}

/* ------------------------------ course progress ---------------------------- */

/** Per-course status of existing records. No new academic grade is created. */
export function CourseProgressSection({
  courses,
}: {
  courses: CourseAnalytics[];
}) {
  return (
    <Section
      title="Course progress"
      note="One card per course, built from the records you already manage in courses, Tuton, assignments, discussions, exam topics and quiz."
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {courses.map((data) => (
          <CourseProgressCard key={data.course.id} data={data} />
        ))}
      </div>
    </Section>
  );
}

function CourseProgressCard({ data }: { data: CourseAnalytics }) {
  const { academic } = data;
  const finalLabel = finalScoreLabel(academic);

  return (
    <article className="rounded-md border border-slate-200 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {data.course.code}
      </p>
      <h3 className="text-base font-semibold text-slate-900">
        {data.course.name}
      </h3>

      <div className="mt-4 space-y-3">
        <ProgressRow
          label="Tuton"
          metric={data.tuton}
          detail={`${data.tuton.active} active · ${data.tuton.overdue} past end date`}
        />
        <ProgressRow
          label="Assignments"
          metric={data.assignments}
          detail={`${data.assignments.overdue} past deadline`}
        />
        <ProgressRow
          label="Discussions"
          metric={data.discussions}
          detail={`${data.discussions.overdue} past deadline`}
        />
        <ProgressRow
          label="Exam topic preparation"
          metric={data.topics}
          detail={`${data.topics.inProgress} in progress`}
        />
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <dt className="text-xs text-slate-500">Questions</dt>
          <dd className="text-sm font-medium text-slate-900">
            {data.questionCount}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Quiz attempts</dt>
          <dd className="text-sm font-medium text-slate-900">
            {data.quiz.attempts}
            <span className="ml-1 text-xs font-normal text-slate-500">
              ({data.quiz.completedAttempts} completed)
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Average quiz score</dt>
          <dd className="text-sm font-medium text-slate-900">
            {percentLabel(data.quiz.averageScore)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Academic scores — existing Phase 7 calculation
        </p>
        <dl className="mt-2 grid grid-cols-3 gap-3">
          <div>
            <dt className="text-xs text-slate-500">Tuton score</dt>
            <dd className="text-sm font-medium text-slate-900">
              {academic.tutonScore === null
                ? "Incomplete"
                : formatScore(academic.tutonScore)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">UAS score</dt>
            <dd className="text-sm font-medium text-slate-900">
              {academic.uasScore === null
                ? "Not available"
                : formatScore(academic.uasScore)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Final score</dt>
            <dd className="text-sm font-medium text-slate-900">{finalLabel}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-slate-500">
          Final = Tuton × {TUTON_COMPONENT_WEIGHT} + UAS ×{" "}
          {UAS_COMPONENT_WEIGHT}, computed by `lib/exam.ts`.{" "}
          {academic.hasUngradedItems
            ? "Estimated — ungraded assignments/discussions are excluded, never counted as zero."
            : academic.hasRecordedScores
              ? "Analytics only displays this value; it does not recalculate or replace it."
              : "No grades recorded for this course yet."}
        </p>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Practice quiz scores are not part of any academic score.
      </p>
    </article>
  );
}

/* ----------------------------------- tuton --------------------------------- */

export function TutonSection({
  tuton,
  perCourse,
}: {
  tuton: TutonMetrics;
  perCourse: CourseAnalytics[];
}) {
  return (
    <Section
      title="Tuton analytics"
      note="Statuses are read from the stored Tuton sessions. Active, upcoming and past end date are derived from the official dates — analytics never changes a stored status."
    >
      {tuton.total === 0 ? (
        <NoDataNote>
          No Tuton data. Initialize the Tuton sessions for a course to see
          progress here.
        </NoDataNote>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MetricTile label="Sessions" value={String(tuton.total)} />
            <MetricTile label="Completed" value={String(tuton.completed)} />
            <MetricTile
              label="Active"
              value={String(tuton.active)}
              detail="Inside date range"
            />
            <MetricTile label="Upcoming" value={String(tuton.upcoming)} />
            <MetricTile
              label="Past end date"
              value={String(tuton.overdue)}
              detail="Derived, status unchanged"
            />
            <MetricTile
              label="Completion"
              value={percentLabel(tuton.percent)}
            />
          </div>

          <h3 className="mt-5 text-xs font-medium uppercase tracking-wide text-slate-500">
            Per course
          </h3>
          <ul className="mt-2 divide-y divide-slate-100">
            {perCourse.map((data) => (
              <li
                key={data.course.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2"
              >
                <span className="min-w-0 text-sm text-slate-700">
                  <span className="font-medium text-slate-900">
                    {data.course.code}
                  </span>{" "}
                  — {data.course.name}
                </span>
                <span className="shrink-0 text-xs text-slate-500">
                  {data.tuton.total === 0
                    ? "No Tuton data"
                    : `${data.tuton.completed} of ${data.tuton.total} sessions · ${percentLabel(data.tuton.percent)}${
                        data.tuton.overdue > 0
                          ? ` · ${data.tuton.overdue} past end date`
                          : ""
                      }`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Section>
  );
}

/* ------------------------------- deadlines --------------------------------- */

function DeadlineGrid({ metrics }: { metrics: DeadlineMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <MetricTile label="Total" value={String(metrics.total)} />
      <MetricTile label="Completed" value={String(metrics.completed)} />
      <MetricTile label="Incomplete" value={String(metrics.incomplete)} />
      <MetricTile
        label="Past deadline"
        value={String(metrics.overdue)}
        detail="Derived, status unchanged"
      />
      <MetricTile label="Completion" value={percentLabel(metrics.percent)} />
    </div>
  );
}

/** Assignments and discussions: existing statuses plus derived overdue. */
export function DeadlinesSection({
  assignments,
  discussions,
}: {
  assignments: DeadlineMetrics;
  discussions: DeadlineMetrics;
}) {
  return (
    <Section
      title="Assignments & discussions"
      note="Counts come from the existing status values (not_started / in_progress / completed). “Past deadline” is derived from the deadline date and today in Asia/Jakarta; the stored status is never changed."
    >
      <div className="space-y-5">
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Assignments
          </h3>
          <div className="mt-2">
            {assignments.total === 0 ? (
              <NoDataNote>No assignment data.</NoDataNote>
            ) : (
              <DeadlineGrid metrics={assignments} />
            )}
          </div>
        </div>
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Discussions
          </h3>
          <div className="mt-2">
            {discussions.total === 0 ? (
              <NoDataNote>No discussion data.</NoDataNote>
            ) : (
              <DeadlineGrid metrics={discussions} />
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------- exam prep -------------------------------- */

export function ExamPreparationSection({
  topics,
  courses,
}: {
  topics: TopicMetrics;
  courses: CourseAnalytics[];
}) {
  return (
    <Section
      title="Exam preparation analytics"
      note="Topic counts use the stored exam topic statuses. The academic scores below are the existing Phase 7 values from lib/exam.ts — analytics adds no new formula, and incomplete data is labeled instead of invented."
    >
      {topics.total === 0 ? (
        <NoDataNote>
          No exam preparation data. Add exam topics in Exam Preparation to track
          preparation here.
        </NoDataNote>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <MetricTile label="Topics" value={String(topics.total)} />
          <MetricTile label="Completed" value={String(topics.completed)} />
          <MetricTile label="In progress" value={String(topics.inProgress)} />
          <MetricTile label="Not started" value={String(topics.notStarted)} />
          <MetricTile
            label="Preparation"
            value={percentLabel(topics.percent)}
          />
        </div>
      )}

      <h3 className="mt-5 text-xs font-medium uppercase tracking-wide text-slate-500">
        Academic scores per course
      </h3>
      <ul className="mt-2 divide-y divide-slate-100">
        {courses.map((data) => {
          const { academic } = data;
          return (
            <li
              key={data.course.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2"
            >
              <span className="min-w-0 text-sm text-slate-700">
                <span className="font-medium text-slate-900">
                  {data.course.code}
                </span>{" "}
                — {data.course.name}
              </span>
              <span className="shrink-0 text-xs text-slate-500">
                {!academic.hasRecordedScores
                  ? "No score data"
                  : `Tuton ${
                      academic.tutonScore === null
                        ? "Incomplete"
                        : formatScore(academic.tutonScore)
                    } · UAS ${
                      academic.uasScore === null
                        ? "Not available"
                        : formatScore(academic.uasScore)
                    } · Final ${finalScoreLabel(academic)}`}
              </span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

/* ----------------------------------- quiz ---------------------------------- */

export function QuizSection({
  quiz,
  questionCount,
  courses,
}: {
  quiz: QuizMetrics;
  questionCount: number;
  courses: CourseAnalytics[];
}) {
  return (
    <Section
      title="Quiz analytics"
      note="Practice data only. In-progress attempts are excluded from the average, the best and the latest score. No mastery or weak-topic score is calculated, and quiz scores never affect academic grades."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricTile label="Questions" value={String(questionCount)} />
        <MetricTile label="Attempts" value={String(quiz.attempts)} />
        <MetricTile
          label="Completed"
          value={String(quiz.completedAttempts)}
        />
        <MetricTile
          label="Average score"
          value={percentLabel(quiz.averageScore)}
        />
        <MetricTile label="Best score" value={percentLabel(quiz.bestScore)} />
        <MetricTile
          label="Latest score"
          value={percentLabel(quiz.latestScore)}
          detail="Most recent completed attempt"
        />
      </div>

      {questionCount === 0 ? (
        <div className="mt-4">
          <NoDataNote>
            No question bank data. Add questions in the Question Bank to
            practice.
          </NoDataNote>
        </div>
      ) : null}

      <h3 className="mt-5 text-xs font-medium uppercase tracking-wide text-slate-500">
        Per course
      </h3>
      <ul className="mt-2 divide-y divide-slate-100">
        {courses.map((data) => (
          <li
            key={data.course.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2"
          >
            <span className="min-w-0 text-sm text-slate-700">
              <span className="font-medium text-slate-900">
                {data.course.code}
              </span>{" "}
              — {data.course.name}
            </span>
            <span className="shrink-0 text-xs text-slate-500">
              {data.questionCount} question
              {data.questionCount === 1 ? "" : "s"} · {data.quiz.attempts}{" "}
              attempt{data.quiz.attempts === 1 ? "" : "s"} · average{" "}
              {percentLabel(data.quiz.averageScore)} · latest{" "}
              {percentLabel(data.quiz.latestScore)}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* --------------------------------- activity -------------------------------- */

/** Simple Tailwind bar chart — no chart library dependency. */
function ActivityBars({ activity }: { activity: ActivitySummary }) {
  const description = activity.week
    .map((day) => `${day.label} ${day.dateIso.slice(8, 10)}: ${day.count}`)
    .join(", ");

  return (
    <div>
      <div
        role="img"
        aria-label={`Recorded activity per day for the last 7 days — ${description}`}
        className="flex items-end gap-1.5 sm:gap-2"
      >
        {activity.week.map((day) => {
          const height =
            activity.maxDaily > 0
              ? Math.max(
                  day.count > 0 ? 6 : 0,
                  Math.round((day.count / activity.maxDaily) * 100)
                )
              : 0;
          return (
            <div
              key={day.dateIso}
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
            >
              <span className="text-xs font-medium text-slate-700">
                {day.count}
              </span>
              <div className="flex h-24 w-full items-end rounded bg-slate-100">
                <div
                  className="w-full rounded bg-slate-900"
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="text-[11px] font-medium text-slate-600">
                {day.label}
              </span>
              <span className="text-[10px] text-slate-400">
                {day.dateIso.slice(8, 10)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Bars are relative to the busiest day in this window ({activity.maxDaily}{" "}
        recorded {activity.maxDaily === 1 ? "activity" : "activities"}). A day
        with 0 recorded activity has no bar.
      </p>
    </div>
  );
}

export function ActivitySection({ activity }: { activity: ActivitySummary }) {
  return (
    <Section
      title="Study activity"
      note="Recorded activity = one event per record per local day (Asia/Jakarta), taken from the created_at / updated_at timestamps that already exist in materials, notes, assignments, discussions, exam topics and quiz attempts. This is a record count, not study time — the application has no time tracking."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricTile
          label="Last 7 days"
          value={String(activity.last7Days)}
          detail="Recorded activity"
        />
        <MetricTile
          label="Last 30 days"
          value={String(activity.last30Days)}
          detail="Includes the 7-day window"
        />
        <MetricTile
          label="Busiest day"
          value={String(activity.maxDaily)}
          detail="In the 7-day window"
        />
      </div>

      {activity.last30Days === 0 ? (
        <div className="mt-4">
          <NoDataNote>No recorded activity in the last 30 days.</NoDataNote>
        </div>
      ) : (
        <>
          <h3 className="mt-5 text-xs font-medium uppercase tracking-wide text-slate-500">
            Last 7 days
          </h3>
          <div className="mt-2">
            <ActivityBars activity={activity} />
          </div>
        </>
      )}
    </Section>
  );
}

/* ------------------------------ progress trend ----------------------------- */

export function TrendSection() {
  return (
    <Section title="Progress trend">
      <p className="text-sm text-slate-600">
        Every metric on this page is a current-state value. The workspace does
        not store historical snapshots, so no historical progress curve is
        shown — percentages are calculated from the records as they exist right
        now, and no past percentage is invented.
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Recorded activity above is the only time-based signal available, because
        it is derived from existing timestamps.
      </p>
    </Section>
  );
}

/* --------------------------------- insights -------------------------------- */

export function InsightsSection({ insights }: { insights: string[] }) {
  if (insights.length === 0) return null;

  return (
    <Section
      title="Insights"
      note="Deterministic observations computed from the metrics above. No prediction, no recommendation and no AI."
    >
      <ul className="space-y-2">
        {insights.map((insight) => (
          <li
            key={insight}
            className="flex items-start gap-2 text-sm text-slate-700"
          >
            <span
              aria-hidden="true"
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400"
            />
            <span className="min-w-0">{insight}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}