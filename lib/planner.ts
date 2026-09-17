import type {
  Assignment,
  Course,
  Discussion,
  Material,
  TutonSession,
} from "@/types/database";

/* --------------------------------- dates ---------------------------------- */

/**
 * Today's date in the user's timezone (Asia/Jakarta) as YYYY-MM-DD.
 * The server may run in UTC; formatting with an explicit timezone keeps the
 * displayed "today" from shifting a day at Jakarta 00:00–06:59.
 */
export function todayIso(timeZone = "Asia/Jakarta"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

/** Parse a YYYY-MM-DD string into a UTC-noon Date (DST-safe date math). */
function parseIsoNoon(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12));
}

function formatIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Add n days to a YYYY-MM-DD string, returning YYYY-MM-DD. */
export function addDaysIso(iso: string, n: number): string {
  const date = parseIsoNoon(iso);
  date.setUTCDate(date.getUTCDate() + n);
  return formatIso(date);
}

/** Monday of the week containing the given ISO date. */
export function startOfWeekIso(iso: string): string {
  const date = parseIsoNoon(iso);
  const day = date.getUTCDay(); // 0 = Sunday
  date.setUTCDate(date.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return formatIso(date);
}

export const WEEKDAY_SHORTS = [
  "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun",
] as const;

/* ------------------------------ planner items ----------------------------- */

export type PlannerItemType = "assignment" | "discussion" | "tuton" | "material";
export type PlannerPriority = "high" | "medium" | "low";

export type PlannerItem = {
  key: string;
  type: PlannerItemType;
  title: string;
  courseId: string;
  courseCode: string;
  /** Deadline for assignments/discussions, end_date for tuton sessions. */
  dateIso: string | null;
  /** Tuton only: session start date, used for "active today" detection. */
  startDateIso: string | null;
  dateLabel: string | null;
  status: string;
  href: string;
  priority: PlannerPriority;
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2026-09-18" -> "18 Sep" (no timezone conversion). */
function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  if (!m || !d) return iso;
  return `${d} ${MONTHS[m - 1]}`;
}

/** "2026-09-14" + "2026-09-20" -> "14–20 Sep". */
function rangeLabel(startIso: string, endIso: string): string {
  const sameMonth = startIso.slice(0, 7) === endIso.slice(0, 7);
  const startDay = Number(startIso.slice(8, 10));
  const end = shortDate(endIso);
  return sameMonth ? `${startDay}–${end}` : `${shortDate(startIso)} – ${end}`;
}


export type PlannerData = {
  courses: Course[];
  sessions: TutonSession[];
  assignments: Assignment[];
  discussions: Discussion[];
  materials: Material[];
};

export type BuiltPlanner = {
  /** All dated (non-review) items sorted by date. */
  all: PlannerItem[];
  /** Material review items (no deadline semantics), most recent first. */
  reviewItems: PlannerItem[];
  /** Completed items count across the academic entities. */
  completedCount: number;
};

/**
 * Deterministic priority (easy to understand, no scoring):
 * - high:   overdue, or due within 3 days (assignment/discussion);
 *           active Tuton session ending within 3 days
 * - medium: due later; upcoming Tuton session starting within 7 days;
 *           other active Tuton sessions
 * - low:    material review (no deadline semantics)
 * Completed items are excluded — status is read from the existing entities.
 */
export function buildPlanner(data: PlannerData, today: string): BuiltPlanner {
  const courseCode = new Map(data.courses.map((c) => [c.id, c.code]));
  const daysUntil = (iso: string) =>
    Math.round(
      (parseIsoNoon(iso).getTime() - parseIsoNoon(today).getTime()) / 86_400_000
    );
  const nearDeadline = (iso: string) => daysUntil(iso) <= 3; // includes overdue

  const assignmentItems: PlannerItem[] = data.assignments
    .filter((a) => a.status !== "completed")
    .map((a) => ({
      key: `assignment-${a.id}`,
      type: "assignment" as const,
      title: a.title,
      courseId: a.course_id,
      courseCode: courseCode.get(a.course_id) ?? "Course",
      dateIso: a.deadline,
      startDateIso: null,
      dateLabel:
        a.deadline < today
          ? `Overdue · ${shortDate(a.deadline)}`
          : shortDate(a.deadline),
      status: a.status,
      href: `/courses/${a.course_id}/assignments`,
      priority: nearDeadline(a.deadline) ? ("high" as const) : ("medium" as const),
    }));

  const discussionItems: PlannerItem[] = data.discussions
    .filter((d) => d.status !== "completed")
    .map((d) => ({
      key: `discussion-${d.id}`,
      type: "discussion" as const,
      title: d.title,
      courseId: d.course_id,
      courseCode: courseCode.get(d.course_id) ?? "Course",
      dateIso: d.deadline,
      startDateIso: null,
      dateLabel:
        d.deadline < today
          ? `Overdue · ${shortDate(d.deadline)}`
          : shortDate(d.deadline),
      status: d.status,
      href: `/courses/${d.course_id}/discussions`,
      priority: nearDeadline(d.deadline) ? ("high" as const) : ("medium" as const),
    }));

  const tutonItems: PlannerItem[] = data.sessions
    .filter((s) => s.status !== "completed")
    .map((s) => {
      const active = s.start_date <= today && s.end_date >= today;
      return {
        key: `tuton-${s.id}`,
        type: "tuton" as const,
        title: `Tuton Sesi ${s.session_number}: ${s.title}`,
        courseId: s.course_id,
        courseCode: courseCode.get(s.course_id) ?? "Course",
        dateIso: s.end_date,
        startDateIso: s.start_date,
        dateLabel: rangeLabel(s.start_date, s.end_date),
        status: s.status,
        href: `/courses/${s.course_id}/tuton`,
        priority: active
          ? nearDeadline(s.end_date)
            ? ("high" as const)
            : ("medium" as const)
          : s.start_date > today && daysUntil(s.start_date) <= 7
            ? ("medium" as const)
            : ("low" as const),
      };
    });

  // Materials have no deadline semantics — labeled as review, kept secondary.
  const reviewItems: PlannerItem[] = [...data.materials]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 3)
    .map((m) => ({
      key: `material-${m.id}`,
      type: "material" as const,
      title: m.title,
      courseId: m.course_id,
      courseCode: courseCode.get(m.course_id) ?? "Course",
      dateIso: null,
      startDateIso: null,
      dateLabel: null,
      status: "review",
      href: `/courses/${m.course_id}/materials`,
      priority: "low" as const,
    }));

  const all = [...assignmentItems, ...discussionItems, ...tutonItems].sort(
    (a, b) => (a.dateIso ?? "").localeCompare(b.dateIso ?? "")
  );

  const completedCount =
    data.sessions.filter((s) => s.status === "completed").length +
    data.assignments.filter((a) => a.status === "completed").length +
    data.discussions.filter((d) => d.status === "completed").length;

  return { all, reviewItems, completedCount };
}

/** Items needing attention today: overdue, due within 3 days, or an
 *  active Tuton session (started, not yet ended). */
export function todayItems(items: PlannerItem[], today: string): PlannerItem[] {
  return items.filter((item) => {
    if (!item.dateIso) return false;
    if (item.dateIso <= addDaysIso(today, 3)) return true;
    return (
      item.startDateIso !== null &&
      item.startDateIso <= today &&
      item.dateIso >= today
    );
  });
}

/** Dated items on or after today, chronological. */
export function upcomingItems(items: PlannerItem[], today: string): PlannerItem[] {
  return items.filter((item) => item.dateIso !== null && item.dateIso >= today);
}

/** Mon–Sun buckets for the week starting at weekStartIso, items due each day. */
export function weekBuckets(
  items: PlannerItem[],
  weekStartIso: string
): { dayIso: string; label: string; items: PlannerItem[] }[] {
  return WEEKDAY_SHORTS.map((label, i) => {
    const dayIso = addDaysIso(weekStartIso, i);
    return {
      dayIso,
      label: `${label} ${Number(dayIso.slice(8, 10))}`,
      // Tuton sessions land on their end date (kept simple; the full
      // start–end range shows in the item's date label).
      items: items.filter((item) => item.dateIso === dayIso),
    };
  });
}
