import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  StatusBadge,
  formatAcademicDate,
  isPastDeadline,
} from "@/components/shared/tuton-status";
import { createClient } from "@/lib/supabase/server";
import type { Course, TutonSession } from "@/types/database";

// Reads the auth session and RLS-scoped data; render per request.
export const dynamic = "force-dynamic";

export default async function TutonPage() {
  const supabase = await createClient();

  const [
    { data: courses, error: coursesError },
    { data: sessions, error: sessionsError },
  ] = await Promise.all([
    supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase
      .from("tuton_sessions")
      .select("*")
      .order("session_number", { ascending: true }),
  ]);

  const courseList = courses ?? [];
  const allSessions = sessions ?? [];

  const sessionsByCourse = new Map<string, TutonSession[]>();
  for (const session of allSessions) {
    const list = sessionsByCourse.get(session.course_id);
    if (list) {
      list.push(session);
    } else {
      sessionsByCourse.set(session.course_id, [session]);
    }
  }

  const totalSessions = allSessions.length;
  const totalCompleted = allSessions.filter(
    (session) => session.status === "completed"
  ).length;
  const overall =
    totalSessions > 0 ? (totalCompleted / totalSessions) * 100 : 0;

  return (
    <>
      <PageHeader
        title="Tuton"
        description="Tuton progress and deadlines across all your courses."
      />

      {coursesError || sessionsError ? (
        <ErrorState
          title="Could not load Tuton data"
          message="An error occurred while loading your Tuton sessions. Please try again."
        />
      ) : courseList.length === 0 ? (
        <EmptyState
          title="No courses yet"
          description="Create a course first, then initialize its Tuton sessions."
          action={
            <Link
              href="/courses"
              className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-700"
            >
              Go to courses
            </Link>
          }
        />
      ) : (
        <>
          {totalSessions > 0 ? (
            <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Overall Tuton progress
                </h2>
                <span className="text-sm font-semibold text-slate-900">
                  {Math.round(overall)}%
                </span>
              </div>
              <ProgressBar value={overall} className="mt-2" />
              <p className="mt-2 text-xs text-slate-500">
                {totalCompleted} of {totalSessions} session
                {totalSessions === 1 ? "" : "s"} completed across{" "}
                {sessionsByCourse.size} course
                {sessionsByCourse.size === 1 ? "" : "s"}
              </p>
            </div>
          ) : null}
          <div className="space-y-4">
            {courseList.map((course) => (
              <CourseTutonBlock
                key={course.id}
                course={course}
                sessions={sessionsByCourse.get(course.id) ?? []}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function CourseTutonBlock({
  course,
  sessions,
}: {
  course: Course;
  sessions: TutonSession[];
}) {
  const completed = sessions.filter(
    (session) => session.status === "completed"
  ).length;
  const progress =
    sessions.length > 0 ? (completed / sessions.length) * 100 : 0;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {course.color ? (
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: course.color }}
              aria-hidden="true"
            />
          ) : null}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {course.code}
            </p>
            <Link
              href={`/courses/${course.id}/tuton`}
              className="text-base font-semibold text-slate-900 hover:underline"
            >
              {course.name}
            </Link>
          </div>
        </div>
        {sessions.length > 0 ? (
          <span className="text-sm font-semibold text-slate-900">
            {Math.round(progress)}%
          </span>
        ) : null}
      </div>

      {sessions.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          Tuton is not initialized for this course.{" "}
          <Link
            href={`/courses/${course.id}/tuton`}
            className="font-medium text-slate-700 underline"
          >
            Open course Tuton
          </Link>{" "}
          to initialize the 8 sessions.
        </p>
      ) : (
        <>
          <ProgressBar value={progress} className="mt-3" />
          <ul className="mt-2 divide-y divide-slate-100">
            {sessions.map((session) => (
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
                      {formatAcademicDate(session.start_date)} &ndash;{" "}
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
        </>
      )}
    </section>
  );
}
