import Link from "next/link";

import { TutonCourseList } from "./tuton-client";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ProgressBar } from "@/components/ui/progress-bar";
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

  const courseList: Course[] = courses ?? [];
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
          {/* Course-first collapsible list; all courses collapsed by default. */}
          <TutonCourseList
            items={courseList.map((course) => ({
              course,
              sessions: sessionsByCourse.get(course.id) ?? [],
            }))}
          />
        </>
      )}
    </>
  );
}
