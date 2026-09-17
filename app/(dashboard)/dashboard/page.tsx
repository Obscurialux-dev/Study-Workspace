import Link from "next/link";

import { CreateCourseAction, DashboardQuickActions } from "./dashboard-actions";
import {
  formatAcademicDate,
  isPastDeadline,
  StatusBadge,
} from "@/components/shared/tuton-status";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { createClient } from "@/lib/supabase/server";
import type {
  Assignment,
  Course,
  Discussion,
  Material,
  Note,
  TutonSession,
} from "@/types/database";

// Reads the auth session and RLS-scoped data; render per request.
export const dynamic = "force-dynamic";

/* ---------------------------------- data ---------------------------------- */

type DashboardData = {
  courses: Course[];
  sessions: TutonSession[];
  assignments: Assignment[];
  discussions: Discussion[];
  materials: Material[];
  notes: Note[];
};

/**
 * Overall course progress: Tuton 50% + Assignments 25% + Discussions 25%.
 * An empty category contributes 0% (no renormalization), so zero-item
 * categories can never produce NaN or Infinity.
 */
function courseProgress(
  sessions: TutonSession[],
  assignments: Assignment[],
  discussions: Discussion[]
) {
  const tuton =
    sessions.length > 0
      ? (sessions.filter((s) => s.status === "completed").length /
          sessions.length) *
        100
      : 0;
  const assign =
    assignments.length > 0
      ? (assignments.filter((a) => a.status === "completed").length /
          assignments.length) *
        100
      : 0;
  const disc =
    discussions.length > 0
      ? (discussions.filter((d) => d.status === "completed").length /
          discussions.length) *
        100
      : 0;

  return {
    tuton,
    assignments: assign,
    discussions: disc,
    overall: tuton * 0.5 + assign * 0.25 + disc * 0.25,
  };
}

function pct(value: number) {
  return `${Math.round(Math.min(100, Math.max(0, value)))}%`;
}

function formatRelative(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return isoTimestamp;

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatAcademicDate(isoTimestamp.slice(0, 10));
}

function todayLocalIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

async function loadDashboard(): Promise<{
  data: DashboardData | null;
  error: boolean;
}> {
  const supabase = await createClient();

  const [
    { data: courses, error: coursesError },
    { data: sessions, error: sessionsError },
    { data: assignments, error: assignmentsError },
    { data: discussions, error: discussionsError },
    { data: materials, error: materialsError },
    { data: notes, error: notesError },
  ] = await Promise.all([
    supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase.from("tuton_sessions").select("*"),
    supabase.from("assignments").select("*"),
    supabase.from("discussions").select("*"),
    supabase.from("materials").select("*"),
    supabase.from("notes").select("*"),
  ]);

  if (
    coursesError ||
    sessionsError ||
    assignmentsError ||
    discussionsError ||
    materialsError ||
    notesError
  ) {
    return { data: null, error: true };
  }

  return {
    data: {
      courses: courses ?? [],
      sessions: sessions ?? [],
      assignments: assignments ?? [],
      discussions: discussions ?? [],
      materials: materials ?? [],
      notes: notes ?? [],
    },
    error: false,
  };
}

/* ------------------------------- components ------------------------------- */

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function CourseProgressCard({
  course,
  sessions,
  assignments,
  discussions,
}: {
  course: Course;
  sessions: TutonSession[];
  assignments: Assignment[];
  discussions: Discussion[];
}) {
  const progress = courseProgress(sessions, assignments, discussions);

  return (
    <Link
      href={`/courses/${course.id}`}
      className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {course.color ? (
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: course.color }}
              aria-hidden="true"
            />
          ) : null}
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {course.code}
            </p>
            <p className="truncate text-sm font-semibold text-slate-900">
              {course.name}
            </p>
          </div>
        </div>
        <span className="shrink-0 text-sm font-semibold text-slate-900">
          {pct(progress.overall)}
        </span>
      </div>

      {course.semester ? (
        <p className="mt-1 text-xs text-slate-500">Semester {course.semester}</p>
      ) : null}

      <ProgressBar value={progress.overall} className="mt-3" />

      <dl className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-slate-500">
        <div>
          <dt>Tuton</dt>
          <dd className="font-medium text-slate-700">{pct(progress.tuton)}</dd>
        </div>
        <div>
          <dt>Assignments</dt>
          <dd className="font-medium text-slate-700">
            {pct(progress.assignments)}
          </dd>
        </div>
        <div>
          <dt>Discussions</dt>
          <dd className="font-medium text-slate-700">
            {pct(progress.discussions)}
          </dd>
        </div>
      </dl>
    </Link>
  );
}

type UpcomingItem = {
  key: string;
  type: "Tuton" | "Assignment" | "Discussion";
  title: string;
  courseCode: string;
  date: string;
  href: string;
};

function TutonOverview({
  sessions,
  courseById,
}: {
  sessions: TutonSession[];
  courseById: Map<string, Course>;
}) {
  const completed = sessions.filter((s) => s.status === "completed").length;
  const progress =
    sessions.length > 0 ? (completed / sessions.length) * 100 : 0;

  // Dashboard communicates "this session/week → all courses": sessions are
  // displayed session_number ASC, then stored start_date ASC, then course
  // code ASC (course_id as the final unique tie-breaker). This sorts the
  // already-loaded rows for display only — the dedicated /tuton page and
  // all stored data are untouched.
  const orderedSessions = [...sessions].sort((a, b) => {
    if (a.session_number !== b.session_number) {
      return a.session_number - b.session_number;
    }
    if (a.start_date !== b.start_date) {
      return a.start_date.localeCompare(b.start_date);
    }
    const codeA = courseById.get(a.course_id)?.code ?? "";
    const codeB = courseById.get(b.course_id)?.code ?? "";
    if (codeA !== codeB) {
      return codeA.localeCompare(codeB);
    }
    return a.course_id.localeCompare(b.course_id);
  });

  return (
    <section className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Tuton overview</h2>
        {sessions.length > 0 ? (
          <span className="text-sm font-semibold text-slate-900">
            {pct(progress)}
          </span>
        ) : null}
      </div>

      {sessions.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          No Tuton sessions yet.{" "}
          <Link href="/tuton" className="font-medium text-slate-700 underline">
            Open Tuton
          </Link>{" "}
          to initialize sessions for your courses.
        </p>
      ) : (
        <>
          <ProgressBar value={progress} className="mt-3" />
          <p className="mt-2 text-xs text-slate-500">
            {completed} of {sessions.length} sessions completed
          </p>
          {/* Scrollable session list (~7 visible rows). Header, percentage,
              progress bar and summary stay outside the scroll area. Every
              session appears exactly once, ordered session-first. flex-1
              lets the list absorb any leftover card height on desktop so
              both cards in the row end at the same bottom edge. */}
          <div className="scroll-subtle mt-4 max-h-[25rem] min-h-0 flex-1 overflow-y-auto pr-1">
            <ul className="divide-y divide-slate-100">
              {orderedSessions.map((session) => (
                <li
                  key={session.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white"
                      aria-hidden="true"
                    >
                      {session.session_number}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {session.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {courseById.get(session.course_id)?.code ?? "Course"}{" "}
                        · {formatAcademicDate(session.start_date)} &ndash;{" "}
                        {formatAcademicDate(session.end_date)}
                        {session.activity_label
                          ? ` · ${session.activity_label}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isPastDeadline(session.end_date, session.status) ? (
                      <span className="text-xs font-medium text-red-600">
                        Past deadline
                      </span>
                    ) : null}
                    <StatusBadge status={session.status} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}


function UpcomingDeadlines({ items }: { items: UpcomingItem[] }) {
  return (
    <section className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">
        Upcoming deadlines
      </h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          No upcoming deadlines. Completed work and past items are not shown
          here.
        </p>
      ) : (
        <div className="scroll-subtle mt-3 max-h-[25rem] min-h-0 flex-1 overflow-y-auto pr-1 lg:max-h-[28rem]">
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.key} className="py-2.5">
                <Link
                  href={item.href}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.courseCode} · {item.type}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-600">
                    {formatAcademicDate(item.date)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

type ActivityItem = {
  key: string;
  label: string;
  courseCode: string | null;
  when: string;
  href: string;
};

function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Recent activity</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          No activity yet. Created and updated records will appear here.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {item.label}
                </p>
                {item.courseCode ? (
                  <p className="text-xs text-slate-500">{item.courseCode}</p>
                ) : null}
              </div>
              <span className="text-xs text-slate-500">
                {formatRelative(item.when)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}


/* --------------------------------- page ----------------------------------- */

export default async function DashboardPage() {
  const { data, error } = await loadDashboard();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of your courses, Tuton progress, and upcoming deadlines."
      />

      {error || !data ? (
        <ErrorState
          title="Could not load your dashboard"
          message="An error occurred while loading your data. Please try again."
        />
      ) : data.courses.length === 0 ? (
        <EmptyState
          title="No courses yet"
          description="Create your first course to start tracking Tuton, materials, notes, assignments, and discussions."
          action={<CreateCourseAction label="Create course" />}
        />
      ) : (
        <DashboardContent data={data} />
      )}
    </>
  );
}

function DashboardContent({ data }: { data: DashboardData }) {
  const { courses, sessions, assignments, discussions, materials, notes } =
    data;

  const courseById = new Map(courses.map((c) => [c.id, c]));
  const sessionsByCourse = new Map<string, TutonSession[]>();
  const assignmentsByCourse = new Map<string, Assignment[]>();
  const discussionsByCourse = new Map<string, Discussion[]>();

  for (const s of sessions) {
    const list = sessionsByCourse.get(s.course_id);
    if (list) list.push(s);
    else sessionsByCourse.set(s.course_id, [s]);
  }
  for (const a of assignments) {
    const list = assignmentsByCourse.get(a.course_id);
    if (list) list.push(a);
    else assignmentsByCourse.set(a.course_id, [a]);
  }
  for (const d of discussions) {
    const list = discussionsByCourse.get(d.course_id);
    if (list) list.push(d);
    else discussionsByCourse.set(d.course_id, [d]);
  }

  const completedSessions = sessions.filter(
    (s) => s.status === "completed"
  ).length;
  const completedAssignments = assignments.filter(
    (a) => a.status === "completed"
  ).length;
  const completedDiscussions = discussions.filter(
    (d) => d.status === "completed"
  ).length;


  // Upcoming deadlines: only not-completed items at or after today.
  // Tuton uses end_date; assignments/discussions use deadline. Dates are
  // compared as stored ISO strings — never normalized.
  const today = todayLocalIso();
  const upcoming: UpcomingItem[] = [
    ...sessions
      .filter((s) => s.status !== "completed" && s.end_date >= today)
      .map((s) => ({
        key: `tuton-${s.id}`,
        type: "Tuton" as const,
        title: s.title,
        courseCode: courseById.get(s.course_id)?.code ?? "Course",
        date: s.end_date,
        href: `/courses/${s.course_id}/tuton`,
      })),
    ...assignments
      .filter((a) => a.status !== "completed" && a.deadline >= today)
      .map((a) => ({
        key: `assignment-${a.id}`,
        type: "Assignment" as const,
        title: a.title,
        courseCode: courseById.get(a.course_id)?.code ?? "Course",
        date: a.deadline,
        href: `/courses/${a.course_id}/assignments`,
      })),
    ...discussions
      .filter((d) => d.status !== "completed" && d.deadline >= today)
      .map((d) => ({
        key: `discussion-${d.id}`,
        type: "Discussion" as const,
        title: d.title,
        courseCode: courseById.get(d.course_id)?.code ?? "Course",
        date: d.deadline,
        href: `/courses/${d.course_id}/discussions`,
      })),
  ].sort((a, b) => a.date.localeCompare(b.date));



  // Recent activity derived from existing records' created_at/updated_at
  // (updated_at wins when the record was edited after creation). No new
  // activity table — this is derived at render time.
  const activity: ActivityItem[] = [
    ...courses.map((c) => ({
      key: `course-${c.id}`,
      label: `Course: ${c.code} — ${c.name}`,
      courseCode: null as string | null,
      when: c.updated_at > c.created_at ? c.updated_at : c.created_at,
      href: `/courses/${c.id}`,
    })),
    ...materials.map((m) => ({
      key: `material-${m.id}`,
      label: `Material: ${m.title}`,
      courseCode: courseById.get(m.course_id)?.code ?? null,
      when: m.updated_at > m.created_at ? m.updated_at : m.created_at,
      href: `/courses/${m.course_id}/materials`,
    })),
    ...notes.map((n) => ({
      key: `note-${n.id}`,
      label: `Note: ${n.title}`,
      courseCode: n.course_id
        ? (courseById.get(n.course_id)?.code ?? null)
        : null,
      when: n.updated_at > n.created_at ? n.updated_at : n.created_at,
      href: n.course_id ? `/courses/${n.course_id}/notes` : "/notes",
    })),
    ...assignments.map((a) => ({
      key: `assignment-${a.id}`,
      label: `Assignment: ${a.title}`,
      courseCode: courseById.get(a.course_id)?.code ?? null,
      when: a.updated_at > a.created_at ? a.updated_at : a.created_at,
      href: `/courses/${a.course_id}/assignments`,
    })),
    ...discussions.map((d) => ({
      key: `discussion-${d.id}`,
      label: `Discussion: ${d.title}`,
      courseCode: courseById.get(d.course_id)?.code ?? null,
      when: d.updated_at > d.created_at ? d.updated_at : d.created_at,
      href: `/courses/${d.course_id}/discussions`,
    })),
    ...sessions.map((s) => ({
      key: `tuton-${s.id}`,
      label: `Tuton session ${s.session_number}: ${s.title}`,
      courseCode: courseById.get(s.course_id)?.code ?? null,
      when: s.updated_at > s.created_at ? s.updated_at : s.created_at,
      href: `/courses/${s.course_id}/tuton`,
    })),
  ]
    .sort((a, b) => b.when.localeCompare(a.when))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Overview summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard
          label="Courses"
          value={courses.length}
          detail="active this semester"
        />
        <SummaryCard
          label="Tuton"
          value={
            sessions.length > 0
              ? pct((completedSessions / sessions.length) * 100)
              : "—"
          }
          detail={
            sessions.length > 0
              ? `${completedSessions}/${sessions.length} sessions`
              : "no sessions yet"
          }
        />
        <SummaryCard
          label="Assignments"
          value={
            assignments.length > 0
              ? pct((completedAssignments / assignments.length) * 100)
              : "—"
          }
          detail={
            assignments.length > 0
              ? `${completedAssignments}/${assignments.length} completed`
              : "no assignments yet"
          }
        />
        <SummaryCard
          label="Discussions"
          value={
            discussions.length > 0
              ? pct((completedDiscussions / discussions.length) * 100)
              : "—"
          }
          detail={
            discussions.length > 0
              ? `${completedDiscussions}/${discussions.length} completed`
              : "no discussions yet"
          }
        />
      </div>

      {/* Course progress cards */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          Course progress
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseProgressCard
              key={course.id}
              course={course}
              sessions={sessionsByCourse.get(course.id) ?? []}
              assignments={assignmentsByCourse.get(course.id) ?? []}
              discussions={discussionsByCourse.get(course.id) ?? []}
            />
          ))}
        </div>
      </section>

      {/* Upcoming deadlines + Tuton overview. Cards stretch to a shared row
          height on desktop (equal tops and bottoms); each card is a flex
          column so its scroll list absorbs the remaining space instead of
          leaving an empty gap. On mobile the cards stack naturally. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <UpcomingDeadlines items={upcoming} />
        <TutonOverview sessions={sessions} courseById={courseById} />
      </div>

      {/* Recent activity */}
      <RecentActivity items={activity} />

      {/* Quick actions */}
      <DashboardQuickActions />
    </div>
  );
}

