import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of your courses, Tuton progress, and upcoming deadlines."
      />
      <EmptyState
        title="Nothing to show yet"
        description="Course progress, Tuton deadlines, and recent activity will appear here once you add your courses."
      />
    </>
  );
}
