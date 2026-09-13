import Link from "next/link";
import { notFound } from "next/navigation";

import { MaterialsClient } from "@/app/(dashboard)/materials/materials-client";
import { CourseNav } from "@/components/shared/course-nav";
import { ErrorState } from "@/components/ui/error-state";
import { createClient } from "@/lib/supabase/server";

// Reads the auth session and RLS-scoped data; render per request.
export const dynamic = "force-dynamic";

export default async function CourseMaterialsPage({
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

  const { data: materials, error } = await supabase
    .from("materials")
    .select("*, courses(code, name), tuton_sessions(session_number)")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

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
          title="Could not load materials"
          message="An error occurred while loading the materials. Please try again."
        />
      ) : (
        <MaterialsClient
          materials={materials ?? []}
          courses={[
            { id: course.id, code: course.code, name: course.name },
          ]}
          fixedCourseId={course.id}
        />
      )}
    </>
  );
}
