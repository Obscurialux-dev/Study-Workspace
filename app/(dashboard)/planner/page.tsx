import Link from "next/link";

import { CreateCourseAction } from "../dashboard/dashboard-actions";
import { StatusBadge } from "@/components/shared/tuton-status";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/shared/page-header";
import {
  addDaysIso,
  buildPlanner,
  startOfWeekIso,
  todayIso,
  todayItems,
  upcomingItems,
  weekBuckets,
  type PlannerItem,
  type PlannerItemType,
} from "@/lib/planner";
import { createClient } from "@/lib/supabase/server";
import type {
  Assignment,
  Course,
  Discussion,
  Material,
  TutonSession,
} from "@/types/database";

// Reads the auth session and RLS-scoped data; render per request.
export const dynamic = "force-dynamic";

/* ---------------------------------- data ---------------------------------- */

type PlannerPageData = {
  courses: Course[];
  sessions: TutonSession[];
  assignments: Assignment[];
  discussions: Discussion[];
  materials: Material[];
};

/** One parallel round of RLS-scoped reads; planner is a derived view only. */
async function loadPlannerData(): Promise<{
  data: PlannerPageData | null;
  error: boolean;
}> {
  const supabase = await createClient();

  const [
    { data: courses, error: coursesError },
    { data: sessions, error: sessionsError },
    { data: assignments, error: assignmentsError },
    { data: discussions, error: discussionsError },
    { data: materials, error: materialsError },
  ] = await Promise.all([
    supabase.from("courses").select("*").order("created_at", { ascending: true }),
    supabase.from("tuton_sessions").select("*"),
    supabase.from("assignments").select("*"),
    supabase.from("discussions").select("*"),
    supabase.from("materials").select("*"),
  ]);

  if (
    coursesError ||
    sessionsError ||
    assignmentsError ||
    discussionsError ||
    materialsError
  ) {
    return { data: null, error: true };
  }

  return {
    data: {
      courses: courses ?? [],
      sessions: sessions ?? [],
      assignments: assignments ?? [],
      discussions: discussions ?? [],
      materials: materials ?? [],
    },
    error: false,
  };
}


/* ------------------------------- components ------------------------------- */

const TYPE_LABELS: Record<PlannerItemType, string> = {
  assignment: "Assignment",
  discussion: "Discussion",
  tuton: "Tuton",
  material: "Material",
};

const PRIORITY_STYLES: Record<PlannerItem["priority"], string> = {
  high: "bg-red-500",
  medium: "bg-amber-400",
  low: "bg-slate-300",
};

function PlannerRow({ item }: { item: PlannerItem }) {
  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-slate-300 hover:bg-slate-50"
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_STYLES[item.priority]}`}
        aria-hidden="true"
        title={`Priority: ${item.priority}`}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-900">
          {item.title}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <span className="font-medium uppercase tracking-wide">
            {item.courseCode}
          </span>
          <span>·</span>
          <span>{TYPE_LABELS[item.type]}</span>
          {item.dateLabel ? (
            <>
              <span>·</span>
              <span
                className={
                  item.dateLabel.startsWith("Overdue")
                    ? "font-medium text-red-600"
                    : undefined
                }
              >
                {item.dateLabel}
              </span>
            </>
          ) : (
            <span className="italic">Review — no deadline</span>
          )}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <StatusBadge status={item.status} />
        <span className="text-slate-400" aria-hidden="true">
          &rarr;
        </span>
      </span>
    </Link>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}


/* ---------------------------------- page ---------------------------------- */

function weekTitle(weekStartIso: string): string {
  const end = addDaysIso(weekStartIso, 6);
  const sameMonth = weekStartIso.slice(0, 7) === end.slice(0, 7);
  const startDay = Number(weekStartIso.slice(8, 10));
  const [, endMonth, endDay] = end.split("-").map(Number);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return sameMonth
    ? `${startDay}–${endDay} ${months[(endMonth ?? 1) - 1]} ${end.slice(0, 4)}`
    : `${startDay} ${months[Number(weekStartIso.slice(5, 7)) - 1]} – ${endDay} ${months[(endMonth ?? 1) - 1]} ${end.slice(0, 4)}`;
}

function filterUrl(course: string | null, week: string | undefined): string {
  const params = new URLSearchParams();
  if (course) params.set("course", course);
  if (week) params.set("week", week);
  const qs = params.toString();
  return qs ? `/planner?${qs}` : "/planner";
}

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1.5 text-sm transition-colors ${
    active
      ? "border-slate-900 bg-slate-900 text-white"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
  }`;

const navButton =
  "inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50";


export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; week?: string }>;
}) {
  const { course: courseParam, week: weekParam } = await searchParams;
  const { data, error } = await loadPlannerData();

  if (error) {
    return (
      <>
        <PageHeader title="Study Planner" />
        <ErrorState
          title="Could not load the planner"
          message="An error occurred while loading your academic data. Please try again."
        />
      </>
    );
  }

  const courses = data?.courses ?? [];
  if (courses.length === 0) {
    return (
      <>
        <PageHeader
          title="Study Planner"
          description="What should I study today?"
        />
        <EmptyState
          title="No courses yet"
          description="Create a course to start planning your Tuton sessions, assignments, discussions, and materials."
          action={<CreateCourseAction label="Create your first course" />}
        />
      </>
    );
  }

  const today = todayIso();
  const built = buildPlanner(
    {
      courses,
      sessions: data?.sessions ?? [],
      assignments: data?.assignments ?? [],
      discussions: data?.discussions ?? [],
      materials: data?.materials ?? [],
    },
    today
  );

  // Week navigation state: `week` is a Monday ISO date; defaults to this week.
  const currentMonday = startOfWeekIso(today);
  const weekStart =
    weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)
      ? weekParam
      : currentMonday;
  const isCurrentWeek = weekStart === currentMonday;

  const courseFilter =
    courseParam && courses.some((c) => c.id === courseParam)
      ? courseParam
      : null;
  const selectedCourse = courses.find((c) => c.id === courseFilter) ?? null;

  const scope = (items: PlannerItem[]) =>
    courseFilter ? items.filter((i) => i.courseId === courseFilter) : items;

  const todayList = scope(todayItems(built.all, today)).sort(
    (a, b) => (a.dateIso ?? "").localeCompare(b.dateIso ?? "")
  );
  const upcomingList = scope(upcomingItems(built.all, today));
  const reviewList = scope(built.reviewItems);
  const buckets = weekBuckets(built.all, weekStart).map((bucket) => ({
    ...bucket,
    items: scope(bucket.items),
  }));
  const weekTotal = buckets.reduce((n, b) => n + b.items.length, 0);


  return (
    <>
      <PageHeader
        title="Study Planner"
        description="What should I study today?"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={filterUrl(courseFilter, addDaysIso(weekStart, -7))}
              className={navButton}
              aria-label="Previous week"
            >
              &larr; Prev
            </Link>
            <Link href={filterUrl(courseFilter, undefined)} className={navButton}>
              This week
            </Link>
            <Link
              href={filterUrl(courseFilter, addDaysIso(weekStart, 7))}
              className={navButton}
              aria-label="Next week"
            >
              Next &rarr;
            </Link>
          </div>
        }
      />

      {/* Course filter */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Link
          href={filterUrl(null, isCurrentWeek ? undefined : weekStart)}
          className={chip(!courseFilter)}
        >
          All Courses
        </Link>
        {courses.map((c) => (
          <Link
            key={c.id}
            href={filterUrl(c.id, isCurrentWeek ? undefined : weekStart)}
            className={chip(courseFilter === c.id)}
            title={c.name}
          >
            {c.code}
          </Link>
        ))}
      </div>


      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Today */}
        <Section
          title={`Today's priorities${selectedCourse ? ` · ${selectedCourse.code}` : ""}`}
        >
          {todayList.length > 0 ? (
            <div className="flex flex-col gap-2">
              {todayList.map((item) => (
                <PlannerRow key={item.key} item={item} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
              <p className="text-sm font-semibold text-slate-900">
                No study items for today.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Check upcoming work below or take a well-earned break.
              </p>
            </div>
          )}
        </Section>

        {/* Upcoming */}
        <Section
          title="Upcoming"
          action={
            built.completedCount > 0 ? (
              <span className="text-xs text-slate-500">
                {built.completedCount} completed item
                {built.completedCount === 1 ? "" : "s"} hidden
              </span>
            ) : undefined
          }
        >
          {upcomingList.length > 0 ? (
            <div className="flex max-h-[26rem] flex-col gap-2 overflow-y-auto pr-1">
              {upcomingList.map((item) => (
                <PlannerRow key={item.key} item={item} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
              <p className="text-sm font-semibold text-slate-900">
                No upcoming items.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {courseFilter
                  ? `Nothing scheduled for ${selectedCourse?.code ?? "this course"} yet.`
                  : "Add assignments, discussions, or Tuton sessions to see them here."}
              </p>
            </div>
          )}
        </Section>
      </div>


      {/* Weekly overview */}
      <div className="mt-6">
        <Section
          title={`Weekly overview${isCurrentWeek ? " (current week)" : ""}`}
          action={
            <span className="text-xs text-slate-500">
              {weekTitle(weekStart)} · {weekTotal} item
              {weekTotal === 1 ? "" : "s"}
            </span>
          }
        >
          {weekTotal > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {buckets.map((bucket) => (
                <div
                  key={bucket.dayIso}
                  className={`rounded-lg border bg-white p-3 shadow-sm ${
                    isCurrentWeek && bucket.dayIso === today
                      ? "border-slate-900"
                      : "border-slate-200"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {bucket.label}
                  </p>
                  {bucket.items.length > 0 ? (
                    <ul className="mt-2 space-y-1.5">
                      {bucket.items.map((item) => (
                        <li key={item.key} className="text-sm leading-snug">
                          <Link
                            href={item.href}
                            className="text-slate-700 transition-colors hover:text-slate-900 hover:underline"
                          >
                            <span
                              className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${PRIORITY_STYLES[item.priority]}`}
                              aria-hidden="true"
                            />
                            {item.title}
                          </Link>
                          <span className="block pl-3 text-xs text-slate-400">
                            {TYPE_LABELS[item.type]} · {item.courseCode}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-slate-300">—</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
              <p className="text-sm font-semibold text-slate-900">
                Nothing scheduled this week.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {courseFilter
                  ? `No deadlines for ${selectedCourse?.code ?? "this course"} in this week.`
                  : "Use Prev/Next to browse other weeks."}
              </p>
            </div>
          )}
        </Section>
      </div>

      {/* Material review — no deadline semantics, always secondary */}
      {reviewList.length > 0 ? (
        <div className="mt-6">
          <Section
            title="Material review"
            action={
              <span className="text-xs text-slate-500">
                Recent materials — optional study items, no deadlines
              </span>
            }
          >
            <div className="flex flex-col gap-2">
              {reviewList.map((item) => (
                <PlannerRow key={item.key} item={item} />
              ))}
            </div>
          </Section>
        </div>
      ) : null}
    </>
  );
}
