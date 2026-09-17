import { AttemptsHistory, type AttemptRow } from "./attempts-client";
import { CreateCourseAction } from "../../dashboard/dashboard-actions";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { createClient } from "@/lib/supabase/server";

// Reads the auth session and RLS-scoped data; render per request.
export const dynamic = "force-dynamic";

export default async function QuizAttemptsPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>;
}) {
  const { course = "" } = await searchParams;
  const supabase = await createClient();

  const [
    { data: courses, error: coursesError },
    { data: attempts, error: attemptsError },
  ] = await Promise.all([
    supabase
      .from("courses")
      .select("id, code, name")
      .order("created_at", { ascending: true }),
    (() => {
      let query = supabase
        .from("quiz_attempts")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(100);
      if (course) query = query.eq("course_id", course);
      return query;
    })(),
  ]);

  const courseList = courses ?? [];
  const courseById = new Map(courseList.map((item) => [item.id, item]));

  const rows: AttemptRow[] = (attempts ?? []).map((attempt) => {
    const courseRef = courseById.get(attempt.course_id) ?? null;
    return {
      ...attempt,
      courseLabel: courseRef
        ? `${courseRef.code} — ${courseRef.name}`
        : "Course",
    };
  });

  return (
    <>
      <PageHeader
        title="Quiz History"
        description="Your practice attempts and their server-calculated scores. Practice only — these scores never affect your academic grades."
      />

      {coursesError || attemptsError ? (
        <ErrorState
          title="Could not load your quiz history"
          message="An error occurred while loading your attempts. Please try again."
        />
      ) : courseList.length === 0 ? (
        <EmptyState
          title="No courses yet"
          description="Create a course first: every practice quiz runs for one course."
          action={<CreateCourseAction />}
        />
      ) : (
        <AttemptsHistory
          attempts={rows}
          courses={courseList}
          courseFilter={course}
        />
      )}
    </>
  );
}