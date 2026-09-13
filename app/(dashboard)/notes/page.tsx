import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotesPage() {
  return (
    <>
      <PageHeader
        title="Notes"
        description="Global and course-specific notes."
      />
      <EmptyState
        title="No notes yet"
        description="Your notes will appear here once you create them."
      />
    </>
  );
}
