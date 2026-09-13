import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function CoursesPage() {
  return (
    <>
      <PageHeader
        title="Courses"
        description="Your courses for the current semester."
      />
      <EmptyState
        title="No courses yet"
        description="Courses you add will be listed and managed here."
      />
    </>
  );
}
