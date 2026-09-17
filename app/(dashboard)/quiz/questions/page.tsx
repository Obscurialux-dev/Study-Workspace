import { CreateCourseAction } from "../../dashboard/dashboard-actions";
import { QuestionBank, type QuestionRow } from "./questions-client";
import { PageHeader } from "@/components/shared/page-header";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { createClient } from "@/lib/supabase/server";

// Reads the auth session and RLS-scoped data; render per request.
export const dynamic = "force-dynamic";

export default async function QuizQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; course?: string }>;
}) {
  const { q = "", course = "" } = await searchParams;
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
    (() => {
      let query = supabase
        .from("questions")
        .select("*")
        .order("created_at", { ascending: false });
      if (course) query = query.eq("course_id", course);
      const term = q.replace(/[,()]/g, " ").trim();
      if (term) {
        query = query.or(
          `question.ilike.%${term}%,explanation.ilike.%${term}%`
        );
      }
      return query;
    })(),
  ]);

  const courseList = courses ?? [];
  const topicList = topics ?? [];
  const materialList = materials ?? [];

  // Flat queries + local maps keep the joined labels explicit and prevent any
  // data from being mixed between courses.
  const courseById = new Map(courseList.map((item) => [item.id, item]));
  const topicById = new Map(topicList.map((item) => [item.id, item]));
  const materialById = new Map(materialList.map((item) => [item.id, item]));

  const rows: QuestionRow[] = (questions ?? []).map((question) => {
    const courseRef = courseById.get(question.course_id) ?? null;
    const topicRef = question.exam_topic_id
      ? topicById.get(question.exam_topic_id) ?? null
      : null;
    const materialRef = question.material_id
      ? materialById.get(question.material_id) ?? null
      : null;
    return {
      ...question,
      courseCode: courseRef?.code ?? "Course",
      topicTitle: topicRef?.title ?? null,
      materialTitle: materialRef?.title ?? null,
    };
  });

  return (
    <>
      <PageHeader
        title="Question Bank"
        description="Questions you write yourself. Optionally link a question to an exam topic or a material."
      />

      {coursesError || topicsError || materialsError || questionsError ? (
        <ErrorState
          title="Could not load your question bank"
          message="An error occurred while loading your questions. Please try again."
        />
      ) : courseList.length === 0 ? (
        <EmptyState
          title="No courses yet"
          description="Create a course first: every question belongs to a course."
          action={<CreateCourseAction />}
        />
      ) : (
        <>
          <SearchFilterBar
            basePath="/quiz/questions"
            q={q}
            qPlaceholder="Search question or explanation..."
            courses={courseList}
            courseId={course}
          />
          <QuestionBank
            questions={rows}
            courses={courseList}
            topics={topicList}
            materials={materialList}
            filtered={Boolean(q.trim() || course)}
          />
        </>
      )}
    </>
  );
}