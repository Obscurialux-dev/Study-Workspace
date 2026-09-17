"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { StatusBadge } from "@/components/shared/tuton-status";
import { EmptyState } from "@/components/ui/empty-state";
import {
  attemptStatus,
  formatAttemptDate,
  formatPercent,
} from "@/lib/quiz";
import type { FilterCourse } from "@/components/shared/search-filter-bar";
import type { QuizAttempt } from "@/types/database";

export type AttemptRow = QuizAttempt & {
  courseLabel: string;
};

const selectClasses =
  "h-9 rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-700 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

/**
 * Practice attempt history: date, course, totals and score, with a course
 * filter kept in the URL (per the architecture's URL-param guidance).
 */
export function AttemptsHistory({
  attempts,
  courses,
  courseFilter,
}: {
  attempts: AttemptRow[];
  courses: FilterCourse[];
  courseFilter: string;
}) {
  const router = useRouter();

  function changeFilter(value: string) {
    const target = value
      ? `/quiz/attempts?course=${encodeURIComponent(value)}`
      : "/quiz/attempts";
    router.replace(target, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor="attempt-course-filter"
          className="text-sm font-medium text-slate-700"
        >
          Course
        </label>
        <select
          id="attempt-course-filter"
          value={courseFilter}
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
      </div>

      {attempts.length === 0 ? (
        <EmptyState
          title="No practice attempts yet"
          description="Start a practice quiz to build your history. Quiz scores are practice only and never affect your grades."
          action={
            <Link
              href="/quiz/practice"
              className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-700"
            >
              Start practice quiz
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {attempts.map((attempt) => {
            const status = attemptStatus(attempt);
            return (
              <li
                key={attempt.id}
                className="rounded-lg border border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300"
              >
                <Link
                  href={`/quiz/attempts/${attempt.id}`}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {attempt.courseLabel}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatAttemptDate(attempt.started_at)}
                      {attempt.completed_at
                        ? ` · finished ${formatAttemptDate(attempt.completed_at)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs text-slate-500">
                      {attempt.correct_answers}/{attempt.total_questions} correct
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {formatPercent(attempt.score)}%
                    </span>
                    <StatusBadge status={status} />
                    <span className="text-xs font-medium text-slate-500">
                      {status === "completed" ? "View result" : "Continue"}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}