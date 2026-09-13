import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function TutonPage() {
  return (
    <>
      <PageHeader
        title="Tuton"
        description="Tuton sessions, activity status, and deadlines across all courses."
      />
      <EmptyState
        title="No Tuton sessions yet"
        description="Tuton session timelines will appear here once your courses are set up."
      />
    </>
  );
}
