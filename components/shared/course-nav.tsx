"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS: { path: string; label: string }[] = [
  { path: "", label: "Overview" },
  { path: "/tuton", label: "Tuton" },
  { path: "/materials", label: "Materials" },
  { path: "/notes", label: "Notes" },
  { path: "/assignments", label: "Assignments" },
  { path: "/discussions", label: "Discussions" },
  { path: "/exam", label: "Exam" },
];

/** Internal navigation for the pages inside a course. */
export function CourseNav({ courseId }: { courseId: string }) {
  const pathname = usePathname();
  const base = `/courses/${courseId}`;

  return (
    <nav
      aria-label="Course sections"
      className="mb-6 flex flex-wrap items-center gap-1 border-b border-slate-200 pb-3"
    >
      {SECTIONS.map((section) => {
        const href = `${base}${section.path}`;
        const active = pathname === href;
        return (
          <Link
            key={section.label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
