import Link from "next/link";
import { notFound } from "next/navigation";

import { TutonClient } from "./tuton-client";
import { CourseNav } from "@/components/shared/course-nav";
import { ErrorState } from "@/components/ui/error-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { createClient } from "@/lib/supabase/server";

// Reads the auth session and RLS-scoped data; render per request.
export const dynamic = "force-dynamic";

export default async function CourseTutonPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = await createClient();

  // RLS: only the owner's course is visible here.
  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();

  if (!course) notFound();

  const { data: sessions, error } = await supabase
    .from("tuton_sessions")
    .select("*")
    .eq("course_id", courseId)
    .order("session_number", { ascending: true });

  const list = sessions ?? [];
  const completed = list.filter((s) => s.status === "completed").length;
  const progress = list.length > 0 ? (completed / list.length) * 100 : 0;

  return (
    <>
      <p className="mb-2 text-sm">
        <Link
          href="/courses"
          className="text-slate-500 transition-colors hover:text-slate-700 hover:underline"
        >
          &larr; All courses
        </Link>
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {course.color ? (
          <span
            className="h-4 w-4 shrink-0 rounded-full"
            style={{ backgroundColor: course.color }}
            aria-hidden="true"
          />
        ) : null}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {course.code}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {course.name}
          </h1>
        </div>
      </div>
      <CourseNav courseId={course.id} />

      {error ? (
        <ErrorState
          title="Could not load Tuton sessions"
          message="An error occurred while loading the Tuton sessions. Please try again."
        />
      ) : (
        <>
          {list.length > 0 ? (
            <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Tuton progress
                </h2>
                <span className="text-sm font-semibold text-slate-900">
                  {Math.round(progress)}%
                </span>
              </div>
              <ProgressBar value={progress} className="mt-2" />
              <p className="mt-2 text-xs text-slate-500">
                {completed} of {list.length} session
                {list.length === 1 ? "" : "s"} completed
              </p>
            </div>
          ) : null}
          <TutonClient courseId={course.id} sessions={list} />
        </>
      )}
    </>
  );
}
