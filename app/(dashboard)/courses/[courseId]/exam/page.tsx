import { redirect } from "next/navigation";

// Phase 7: the real Exam Preparation workspace lives at /exam (with a
// ?course= filter). The course subpage deep-links into it, pre-filtered.
export const dynamic = "force-dynamic";

export default async function CourseExamPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  redirect(`/exam?course=${encodeURIComponent(courseId)}`);
}

