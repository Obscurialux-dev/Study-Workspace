"use client";

import { useRouter } from "next/navigation";

const selectClasses =
  "h-9 rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-700 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

export type FilterCourse = { id: string; code: string; name: string };

/**
 * URL-param based search/filter bar (search + optional course/status
 * selects). Keeps filter state in the URL, per the architecture's
 * "use URL params for navigation state" guidance.
 */
export function SearchFilterBar({
  basePath,
  q = "",
  qPlaceholder = "Search...",
  courses,
  courseId = "",
  status = "",
  statuses,
}: {
  basePath: string;
  q?: string;
  qPlaceholder?: string;
  courses?: FilterCourse[];
  courseId?: string;
  status?: string;
  statuses?: { value: string; label: string }[];
}) {
  const router = useRouter();

  function push(next: { q?: string; course?: string; status?: string }) {
    const params = new URLSearchParams();
    const merged = {
      q,
      course: courseId,
      status,
      ...next,
    };
    if (merged.q) params.set("q", merged.q);
    if (merged.course) params.set("course", merged.course);
    if (merged.status) params.set("status", merged.status);
    const query = params.toString();
    router.replace(query ? `${basePath}?${query}` : basePath, { scroll: false });
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const value = new FormData(event.currentTarget).get("q");
          push({ q: String(value ?? "").trim() });
        }}
        className="flex min-w-0 flex-1 items-center gap-2"
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={qPlaceholder}
          className="h-9 w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        <button
          type="submit"
          className="h-9 shrink-0 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Search
        </button>
      </form>
      {courses ? (
        <select
          aria-label="Filter by course"
          value={courseId}
          onChange={(event) => push({ course: event.target.value })}
          className={selectClasses}
        >
          <option value="">All courses</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.code} — {course.name}
            </option>
          ))}
        </select>
      ) : null}
      {statuses ? (
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(event) => push({ status: event.target.value })}
          className={selectClasses}
        >
          <option value="">All statuses</option>
          {statuses.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
