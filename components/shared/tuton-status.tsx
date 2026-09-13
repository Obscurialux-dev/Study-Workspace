export type TutonStatus = "upcoming" | "active" | "completed";

export const TUTON_STATUSES: TutonStatus[] = [
  "upcoming",
  "active",
  "completed",
];

const STATUS_STYLES: Record<string, string> = {
  upcoming: "bg-slate-100 text-slate-600",
  active: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-50 text-emerald-700",
  not_started: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-100 text-blue-700",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style}`}
    >
      {status}
    </span>
  );
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Formats a date-only ISO string (YYYY-MM-DD) without any timezone
 * conversion: academic schedule dates must not shift by a day.
 */
export function formatAcademicDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

function todayLocalIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Display-only "past deadline" indicator (derived from the local date).
 * Never persisted as a status.
 */
export function isPastDeadline(endDate: string, status: string): boolean {
  return status !== "completed" && endDate < todayLocalIso();
}
