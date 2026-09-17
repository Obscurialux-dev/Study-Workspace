"use client";

import Link from "next/link";
import { useState } from "react";

import {
  StatusBadge,
  formatAcademicDate,
  isPastDeadline,
} from "@/components/shared/tuton-status";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { Course, TutonSession } from "@/types/database";

export type TutonCourseEntry = {
  course: Course;
  sessions: TutonSession[];
};

/**
 * Inline chevron (no icon dependency): points right when collapsed,
 * down when expanded.
 */
function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 ${
        expanded ? "rotate-0" : "-rotate-90"
      }`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * Course-first Tuton list. Each course is a collapsible card: collapsed by
 * default, multiple courses may be open at the same time. Toggling is local
 * client state — no navigation and no URL state. Session rows are unchanged
 * from the previous always-expanded rendering.
 */
export function TutonCourseList({ items }: { items: TutonCourseEntry[] }) {
  return (
    <div className="space-y-4">
      {items.map(({ course, sessions }) => (
        <TutonCourseCard key={course.id} course={course} sessions={sessions} />
      ))}
    </div>
  );
}

function TutonCourseCard({
  course,
  sessions,
}: {
  course: Course;
  sessions: TutonSession[];
}) {
  const [open, setOpen] = useState(false);

  const completed = sessions.filter(
    (session) => session.status === "completed"
  ).length;
  const progress =
    sessions.length > 0 ? (completed / sessions.length) * 100 : 0;
  const panelId = `tuton-sessions-${course.id}`;

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full p-5 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {course.color ? (
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: course.color }}
                aria-hidden="true"
              />
            ) : null}
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {course.code}
              </p>
              <p className="truncate text-base font-semibold text-slate-900">
                {course.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {sessions.length > 0 ? (
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">
                  {Math.round(progress)}%
                </p>
                <p className="text-xs text-slate-500">
                  {completed}/{sessions.length} sessions
                </p>
              </div>
            ) : (
              <span className="text-xs text-slate-500">Not initialized</span>
            )}
            <ChevronIcon expanded={open} />
          </div>
        </div>
        {sessions.length > 0 ? (
          <ProgressBar value={progress} className="mt-3" />
        ) : null}
      </button>

      {open ? (
        <div id={panelId} className="border-t border-slate-100 px-5 py-4">
          {sessions.length === 0 ? (
            <p className="text-sm text-slate-500">
              Tuton is not initialized for this course.{" "}
              <Link
                href={`/courses/${course.id}/tuton`}
                className="font-medium text-slate-700 underline"
              >
                Open course Tuton
              </Link>{" "}
              to initialize the 8 sessions.
            </p>
          ) : (
            <>
              <div className="mb-1 flex justify-end">
                <Link
                  href={`/courses/${course.id}/tuton`}
                  className="text-xs font-medium text-slate-500 underline transition-colors hover:text-slate-700"
                >
                  Open course Tuton
                </Link>
              </div>
              <ul className="divide-y divide-slate-100">
                {sessions.map((session) => (
                  <li
                    key={session.id}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white"
                        aria-hidden="true"
                      >
                        {session.session_number}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {session.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatAcademicDate(session.start_date)} &ndash;{" "}
                          {formatAcademicDate(session.end_date)}
                          {session.activity_label
                            ? ` · ${session.activity_label}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isPastDeadline(session.end_date, session.status) ? (
                        <span className="text-xs font-medium text-red-600">
                          Past deadline
                        </span>
                      ) : null}
                      <StatusBadge status={session.status} />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}