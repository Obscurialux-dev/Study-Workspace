import { CreateCourseAction } from "../../dashboard/dashboard-actions";
import { PracticeForm, type PracticeQuestionIndex } from "./practice-form";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { createClient } from "@/lib/supabase/server";

// Reads the auth session and RLS-scoped data; render per request.
export const dynamic = "force-dynamic";

export default async function QuizPracticePage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>;
}) {
  const { course = "" } = await searchParams;
  const supabase = await createClient();

  const [
    { data: courses, error: coursesError },
    { data: topics, error: topicsError },
    { data: materials, error: materialsError },
    { data: questions, error: questionsError },
  ] = await Promise.all([
    supabase
      .from("courses")
      .select("id, code, name")
      .order("created_at", { ascending: true }),
    supabase
      .from("exam_topics")
      .select("id, course_id, title")
      .order("created_at", { ascending: true }),
    supabase
      .from("materials")
      .select("id, course_id, title, module_name")
      .order("created_at", { ascending: true }),
    // Only ids/relations are needed to preview how many questions match.
    supabase
      .from("questions")
      .select("id, course_id, exam_topic_id, material_id"),
  ]);

  const courseList = courses ?? [];
  const questionIndex: PracticeQuestionIndex[] = questions ?? [];
  const courseFiltered = course
    ? courseList.some((item) => item.id === course)
    : false;

  return (
    <>
      <PageHeader
        title="Practice Quiz"
        description="Build a practice quiz from your own question bank. The score is calculated on the server after you submit."
      />

      {coursesError || topicsError || materialsError || questionsError ? (
        <ErrorState
          title="Could not load practice data"
          message="An error occurred while loading your questions. Please try again."
        />
      ) : courseList.length === 0 ? (
        <EmptyState
          title="No courses yet"
          description="Create a course first: every practice quiz runs for one course."
          action={<CreateCourseAction />}
        />
      ) : (
        <PracticeForm
          courses={courseList}
          topics={topics ?? []}
          materials={materials ?? []}
          questionIndex={questionIndex}
          initialCourseId={courseFiltered ? course : ""}
        />
      )}
    </>
  );
}