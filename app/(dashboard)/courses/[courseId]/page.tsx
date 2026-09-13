import Link from "next/link";
import { notFound } from "next/navigation";

import { CourseNav } from "@/components/shared/course-nav";
import { createClient } from "@/lib/supabase/server";

// Reads the auth session and RLS-scoped data; render per request.
export const dynamic = "force-dynamic";

export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = await createClient();

  // RLS restricts this read to the user's own rows; a missing or
  // foreign-owned (or invalid) id yields no row -> 404.
  const { data: course, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .maybeSingle();

  if (error || !course) notFound();

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
      <dl className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Course code
          </dt>
          <dd className="mt-1 text-sm text-slate-900">{course.code}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Semester
          </dt>
          <dd className="mt-1 text-sm text-slate-900">
            {course.semester ?? "—"}
          </dd>
        </div>
        {course.icon ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Icon
            </dt>
            <dd className="mt-1 text-sm text-slate-900">{course.icon}</dd>
          </div>
        ) : null}
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Description
          </dt>
          <dd className="mt-1 text-sm leading-6 text-slate-900">
            {course.description ?? "—"}
          </dd>
        </div>
      </dl>
    </>
  );
}
