"use client";

import { useRouter } from "next/navigation";

import type { FilterCourse } from "@/components/shared/search-filter-bar";

const selectClasses =
  "h-9 rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-700 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

/**
 * Course filter for the analytics page. The selection lives in the URL
 * (`?course=`) per the project's URL-param guidance, and every metric on the
 * page is recalculated for the selected course.
 */
export function AnalyticsCourseFilter({
  courses,
  courseId,
}: {
  courses: FilterCourse[];
  courseId: string;
}) {
  const router = useRouter();

  function changeFilter(value: string) {
    const target = value
      ? `/analytics?course=${encodeURIComponent(value)}`
      : "/analytics";
    router.replace(target, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <label
        htmlFor="analytics-course-filter"
        className="text-sm font-medium text-slate-700"
      >
        Course
      </label>
      <select
        id="analytics-course-filter"
        value={courseId}
        onChange={(event) => changeFilter(event.target.value)}
        className={selectClasses}
      >
        <option value="">All courses</option>
        {courses.map((course) => (
          <option key={course.id} value={course.id}>
            {course.code} — {course.name}
          </option>
        ))}
      </select>
      <span className="text-xs text-slate-500">
        {courseId
          ? "Showing the selected course only."
          : "Showing all courses combined."}
      </span>
    </div>
  );
}