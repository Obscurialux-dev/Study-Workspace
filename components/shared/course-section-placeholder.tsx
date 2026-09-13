import { CourseNav } from "./course-nav";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Shared placeholder body for the not-yet-functional course sections
 * (Tuton, Materials, Notes, Assignments, Discussions, Exam).
 */
export function CourseSectionPlaceholder({
  courseId,
  section,
  description,
}: {
  courseId: string;
  section: string;
  description: string;
}) {
  return (
    <>
      <CourseNav courseId={courseId} />
      <EmptyState
        title={`${section} is not available yet`}
        description={description}
      />
    </>
  );
}
