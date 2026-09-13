import Link from "next/link";

import { CourseSectionPlaceholder } from "@/components/shared/course-section-placeholder";
import { PageHeader } from "@/components/shared/page-header";

export const dynamic = "force-dynamic";

export default async function CourseExamPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return (
    <>
      <p className="mb-2 text-sm">
        <Link
          href="/courses"
          className="text-slate-500 transition-colors hover:text-slate-700 hover:underline"
        >
          &larr; All courses
        </Link>
      </p>
      <PageHeader
        title="Exam"
        description="Exam preparation for this course."
      />
      <CourseSectionPlaceholder
        courseId={courseId}
        section="Exam"
        description="Exam preparation for this course will be implemented in a later phase."
      />
    </>
  );
}
