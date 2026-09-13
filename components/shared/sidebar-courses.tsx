"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import type { Course } from "@/types/database";

type SidebarCourse = Pick<Course, "id" | "code" | "name" | "color">;

const linkClasses = (active: boolean) =>
  `flex items-center gap-2 rounded-md py-1.5 pl-11 pr-3 text-[13px] transition-colors ${
    active
      ? "bg-slate-100 font-medium text-slate-900"
      : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
  }`;

/**
 * Lightweight list of the user's courses shown under the Courses nav item.
 * Fetched directly from Supabase (RLS-scoped); renders nothing on error or
 * when the user has no courses yet.
 */
export function SidebarCourses() {
  const pathname = usePathname();
  const [courses, setCourses] = useState<SidebarCourse[] | null>(null);

  useEffect(() => {
    let active = true;

    createClient()
      .from("courses")
      .select("id, code, name, color")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (active) setCourses(data ?? []);
      });

    return () => {
      active = false;
    };
  }, []);

  // No courses (or fetch failed): keep the sidebar clean.
  if (!courses || courses.length === 0) return null;
  if (pathname !== "/courses" && !pathname.startsWith("/courses/")) return null;

  return (
    <div className="flex flex-col gap-0.5">
      {courses.map((course) => {
        const href = `/courses/${course.id}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={course.id}
            href={href}
            aria-current={active ? "page" : undefined}
            className={linkClasses(active)}
            title={course.name}
          >
            {course.color ? (
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: course.color }}
                aria-hidden="true"
              />
            ) : null}
            <span className="truncate">{course.code}</span>
          </Link>
        );
      })}
    </div>
  );
}
