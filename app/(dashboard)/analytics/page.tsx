import { AnalyticsCourseFilter } from "./analytics-course-filter";
import {
  ActivitySection,
  CourseProgressSection,
  DeadlinesSection,
  ExamPreparationSection,
  InsightsSection,
  OverviewSection,
  QuizSection,
  TrendSection,
  TutonSection,
} from "./analytics-sections";
import { CreateCourseAction } from "../dashboard/dashboard-actions";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { buildAnalytics, type AnalyticsInputs } from "@/lib/analytics";
import { todayIso } from "@/lib/planner";
import { createClient } from "@/lib/supabase/server";

// Reads the auth session and RLS-scoped data; render per request.
export const dynamic = "force-dynamic";

type CourseOption = { id: string; code: string; name: string };

/**
 * One round of independent, RLS-scoped reads with only the columns analytics
 * needs. When a course is selected the row queries are filtered in SQL (no
 * query per course, no N+1 pattern), while the course list itself is always
 * loaded in full so the filter stays usable.
 */
async function loadAnalytics(courseFilter: string): Promise<{
  inputs: AnalyticsInputs | null;
  allCourses: CourseOption[];
  error: boolean;
}> {
  const supabase = await createClient();

  const coursesQuery = supabase
    .from("courses")
    .select("id, code, name, uas_score")
    .order("created_at", { ascending: true });
  let sessionsQuery = supabase
    .from("tuton_sessions")
    .select("course_id, status, start_date, end_date");
  let assignmentsQuery = supabase
    .from("assignments")
    .select(
      "course_id, status, deadline, score, score_max, created_at, updated_at"
    );
  let discussionsQuery = supabase
    .from("discussions")
    .select(
      "course_id, status, deadline, score, score_max, created_at, updated_at"
    );
  let materialsQuery = supabase
    .from("materials")
    .select("course_id, created_at, updated_at");
  let notesQuery = supabase
    .from("notes")
    .select("course_id, created_at, updated_at");
  let topicsQuery = supabase
    .from("exam_topics")
    .select("course_id, status, created_at, updated_at");
  let questionsQuery = supabase
    .from("questions")
    .select("course_id, created_at, updated_at");
  let attemptsQuery = supabase
    .from("quiz_attempts")
    .select("course_id, started_at, completed_at, score");

  if (courseFilter) {
    sessionsQuery = sessionsQuery.eq("course_id", courseFilter);
    assignmentsQuery = assignmentsQuery.eq("course_id", courseFilter);
    discussionsQuery = discussionsQuery.eq("course_id", courseFilter);
    materialsQuery = materialsQuery.eq("course_id", courseFilter);
    notesQuery = notesQuery.eq("course_id", courseFilter);
    topicsQuery = topicsQuery.eq("course_id", courseFilter);
    questionsQuery = questionsQuery.eq("course_id", courseFilter);
    attemptsQuery = attemptsQuery.eq("course_id", courseFilter);
  }

  const [
    { data: courses, error: coursesError },
    { data: sessions, error: sessionsError },
    { data: assignments, error: assignmentsError },
    { data: discussions, error: discussionsError },
    { data: materials, error: materialsError },
    { data: notes, error: notesError },
    { data: topics, error: topicsError },
    { data: questions, error: questionsError },
    { data: attempts, error: attemptsError },
  ] = await Promise.all([
    coursesQuery,
    sessionsQuery,
    assignmentsQuery,
    discussionsQuery,
    materialsQuery,
    notesQuery,
    topicsQuery,
    questionsQuery,
    attemptsQuery,
  ]);

  const allCourses = (courses ?? []).map(({ id, code, name }) => ({
    id,
    code,
    name,
  }));

  if (
    coursesError ||
    sessionsError ||
    assignmentsError ||
    discussionsError ||
    materialsError ||
    notesError ||
    topicsError ||
    questionsError ||
    attemptsError
  ) {
    return { inputs: null, allCourses, error: true };
  }

  // With a course filter every metric is scoped to that course, so other
  // courses can never appear as empty or zero data.
  const scopedCourses = courseFilter
    ? (courses ?? []).filter((course) => course.id === courseFilter)
    : (courses ?? []);

  return {
    allCourses,
    error: false,
    inputs: {
      courses: scopedCourses,
      sessions: sessions ?? [],
      assignments: assignments ?? [],
      discussions: discussions ?? [],
      materials: materials ?? [],
      notes: notes ?? [],
      topics: topics ?? [],
      questions: questions ?? [],
      attempts: attempts ?? [],
      today: todayIso(),
    },
  };
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string }>;
}) {
  const { course: courseFilter = "" } = await searchParams;
  const { inputs, allCourses, error } = await loadAnalytics(courseFilter);

  if (error || !inputs) {
    return (
      <>
        <PageHeader
          title="Study Analytics"
          description="Progress and activity derived from the records already in your workspace."
        />
        <ErrorState
          title="Could not load analytics"
          message="An error occurred while loading your study data. Please try again."
        />
      </>
    );
  }

  const summary = buildAnalytics(inputs);
  const courseNotFound = courseFilter !== "" && inputs.courses.length === 0;

  return (
    <>
      <PageHeader
        title="Study Analytics"
        description="Derived from the records already stored in your workspace. Read-only: nothing here changes your data or your grades."
      />

      {allCourses.length === 0 ? (
        <EmptyState
          title="No courses yet"
          description="Create a course first: analytics is calculated from your existing course records."
          action={<CreateCourseAction />}
        />
      ) : (
        <div className="space-y-6">
          <AnalyticsCourseFilter
            courses={allCourses}
            courseId={courseFilter}
          />

          {courseNotFound ? (
            <EmptyState
              title="Course not found"
              description="The selected course does not exist. Pick another course from the filter."
            />
          ) : (
            <>
              <OverviewSection overall={summary.overall} />
              <CourseProgressSection courses={summary.perCourse} />
              <TutonSection
                tuton={summary.overall.tuton}
                perCourse={summary.perCourse}
              />
              <DeadlinesSection
                assignments={summary.overall.assignments}
                discussions={summary.overall.discussions}
              />
              <ExamPreparationSection
                topics={summary.overall.topics}
                courses={summary.perCourse}
              />
              <QuizSection
                quiz={summary.overall.quiz}
                questionCount={summary.overall.questionCount}
                courses={summary.perCourse}
              />
              <ActivitySection activity={summary.activity} />
              <TrendSection />
              <InsightsSection insights={summary.insights} />
            </>
          )}
        </div>
      )}
    </>
  );
}