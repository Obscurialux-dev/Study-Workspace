import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function MaterialsPage() {
  return (
    <>
      <PageHeader
        title="Materials"
        description="Course materials saved as text or files."
      />
      <EmptyState
        title="No materials yet"
        description="Materials you save will be collected here, organized per course."
      />
    </>
  );
}
