import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function ExamPage() {
  return (
    <>
      <PageHeader
        title="Exam"
        description="Exam preparation, quizzes, and practice exams."
      />
      <EmptyState
        title="No exam preparation yet"
        description="Study topics, quizzes, and practice exams will appear here."
      />
    </>
  );
}
