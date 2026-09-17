import { CreateCourseAction } from "../dashboard/dashboard-actions";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { ExamWorkspace, type ExamCourseData } from "./exam-client";
import { createClient } from "@/lib/supabase/server";
import type {
  Assignment,
  Course,
  Discussion,
  ExamTopic,
  Material,
} from "@/types/database";

// Reads the auth session and RLS-scoped data; render per request.
export const dynamic = "force-dynamic";

type ExamPageData = {
  courses: Course[];
  assignments: Assignment[];
  discussions: Discussion[];
  topics: ExamTopic[];
  materials: Pick<Material, "id" | "course_id" | "title" | "module_name">[];
};

/** One parallel round of RLS-scoped reads. */
async function loadExamData(): Promise<{
  data: ExamPageData | null;
  error: boolean;
}> {
  const supabase = await createClient();

  const [
    { data: courses, error: coursesError },
    { data: assignments, error: assignmentsError },
    { data: discussions, error: discussionsError },
    { data: topics, error: topicsError },
    { data: materials, error: materialsError },
  ] = await Promise.all([
    supabase.from("courses").select("*").order("created_at", { ascending: true }),
    supabase.from("assignments").select("*").order("deadline", { ascending: true }),
    supabase.from("discussions").select("*").order("deadline", { ascending: true }),
    supabase.from("exam_topics").select("*").order("created_at", { ascending: true }),
    supabase
      .from("materials")
      .select("id, course_id, title, module_name")
      .order("created_at", { ascending: true }),
  ]);

  if (
    coursesError ||
    assignmentsError ||
    discussionsError ||
    topicsError ||
    materialsError
  ) {
    return { data: null, error: true };
  }

  return {
    data: {
      courses: courses ?? [],
      assignments: assignments ?? [],
      discussions: discussions ?? [],
      topics: topics ?? [],
      materials: materials ?? [],
    },
    error: false,
  };
}

/** Groups the flat rows per course so data is never mixed between courses. */
function groupByCourse(data: ExamPageData): ExamCourseData[] {
  return data.courses.map((course) => ({
    course,
    assignments: data.assignments.filter((a) => a.course_id === course.id),
    discussions: data.discussions.filter((d) => d.course_id === course.id),
    topics: data.topics.filter((t) => t.course_id === course.id),
    materials: data.materials
      .filter((m) => m.course_id === course.id)
      .map((m) => ({ id: m.id, title: m.title, module_name: m.module_name })),
  }));
}

export default async function ExamPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>;
}) {
  const { course: courseFilter = "" } = await searchParams;
  const { data, error } = await loadExamData();

  if (error || !data) {
    return (
      <>
        <PageHeader
          title="Exam Preparation"
          description="Prepare for exams and track your academic scores."
        />
        <ErrorState
          title="Could not load exam preparation"
          message="An error occurred while loading your data. Please try again."
        />
      </>
    );
  }

  const bundles = groupByCourse(data);

  // A course filter only selects that course's own section; data is never mixed.
  const selected = courseFilter
    ? bundles.filter((b) => b.course.id === courseFilter)
    : bundles;

  return (
    <>
      <PageHeader
        title="Exam Preparation"
        description="Prepare for UAS, track Tuton and UAS scores, and see your final course score."
      />
      {data.courses.length === 0 ? (
        <EmptyState
          title="No courses yet"
          description="Create a course first to start preparing for its exam."
          action={<CreateCourseAction />}
        />
      ) : selected.length === 0 ? (
        <EmptyState
          title="Course not found"
          description="The selected course does not exist. Pick another course from the filter."
        />
      ) : (
        <ExamWorkspace courses={selected} courseFilter={courseFilter} />
      )}
    </>
  );
}

