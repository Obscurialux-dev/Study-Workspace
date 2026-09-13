"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ActionResult = {
  error?: string;
};

/**
 * The supplied 2026/2027 Tuton schedule. Dates are intentional (including
 * overlaps) and must be stored and displayed exactly as provided — never
 * normalized or generated as weekly offsets.
 */
const TUTON_SCHEDULE = [
  { sessionNumber: 1, startDate: "2026-09-14", endDate: "2026-09-20", materialLabel: "Inisiasi 1", activityLabel: "Diskusi 1", activityType: "discussion" },
  { sessionNumber: 2, startDate: "2026-09-21", endDate: "2026-09-27", materialLabel: "Inisiasi 2", activityLabel: "Diskusi 2", activityType: "discussion" },
  { sessionNumber: 3, startDate: "2026-09-28", endDate: "2026-10-12", materialLabel: "Inisiasi 3", activityLabel: "Tugas 1", activityType: "assignment" },
  { sessionNumber: 4, startDate: "2026-10-05", endDate: "2026-10-11", materialLabel: "Inisiasi 4", activityLabel: "Diskusi 4", activityType: "discussion" },
  { sessionNumber: 5, startDate: "2026-10-12", endDate: "2026-10-26", materialLabel: "Inisiasi 5", activityLabel: "Tugas 2", activityType: "assignment" },
  { sessionNumber: 6, startDate: "2026-10-19", endDate: "2026-10-25", materialLabel: "Inisiasi 6", activityLabel: "Diskusi 6", activityType: "discussion" },
  { sessionNumber: 7, startDate: "2026-10-26", endDate: "2026-11-09", materialLabel: "Inisiasi 7", activityLabel: "Tugas 3", activityType: "assignment" },
  { sessionNumber: 8, startDate: "2026-11-02", endDate: "2026-11-08", materialLabel: "Inisiasi 8", activityLabel: "Diskusi 8", activityType: "discussion" },
] as const;

const STATUSES = ["upcoming", "active", "completed"];
const ACTIVITY_TYPES = ["discussion", "assignment"];
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Map raw Supabase errors to clearer, user-facing messages. */
function friendly(message: string) {
  if (message.includes("duplicate key")) {
    return "This session already exists.";
  }
  if (message.includes("check constraint")) {
    return "One of the values is not allowed (dates, status, or activity type).";
  }
  return "Could not save the session. Please try again.";
}

/** Strict ISO date (YYYY-MM-DD) check including calendar validity. */
function isValidIsoDate(value: string) {
  if (!ISO_DATE_RE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Creates the exact 8 supplied Tuton sessions for a course. Missing session
 * numbers are filled in; the database unique constraint on
 * (course_id, session_number) is the additional safety layer against
 * duplicate initialization.
 */
export async function initializeTuton(
  courseId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  // RLS: only the owner's course is visible here.
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .maybeSingle();

  if (courseError) {
    return { error: "Could not verify the course. Please try again." };
  }
  if (!course) return { error: "Course not found." };

  const { data: existing, error: existingError } = await supabase
    .from("tuton_sessions")
    .select("session_number")
    .eq("course_id", courseId);

  if (existingError) {
    return { error: "Could not check existing sessions. Please try again." };
  }

  const existingNumbers = new Set(
    (existing ?? []).map((row) => row.session_number)
  );
  if (existingNumbers.size >= TUTON_SCHEDULE.length) {
    return { error: "Tuton is already initialized for this course." };
  }

  const rows = TUTON_SCHEDULE.filter(
    (entry) => !existingNumbers.has(entry.sessionNumber)
  ).map((entry) => ({
    course_id: courseId,
    session_number: entry.sessionNumber,
    title: `Session ${entry.sessionNumber}`,
    start_date: entry.startDate,
    end_date: entry.endDate,
    material_label: entry.materialLabel,
    activity_label: entry.activityLabel,
    activity_type: entry.activityType,
  }));

  const { error } = await supabase.from("tuton_sessions").insert(rows);

  if (error) {
    if (error.code === "23505") {
      return { error: "Tuton is already initialized for this course." };
    }
    return { error: "Could not initialize Tuton sessions. Please try again." };
  }

  revalidatePath("/tuton");
  revalidatePath(`/courses/${courseId}/tuton`);
  return {};
}

export async function updateTutonSession(
  sessionId: string,
  formData: FormData
): Promise<ActionResult> {
  const title = String(formData.get("title") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "").trim();
  const endDate = String(formData.get("end_date") ?? "").trim();
  const materialLabel = String(formData.get("material_label") ?? "").trim();
  const activityLabel = String(formData.get("activity_label") ?? "").trim();
  const activityType = String(formData.get("activity_type") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!title) return { error: "Session title is required." };
  if (!isValidIsoDate(startDate)) return { error: "Start date is invalid." };
  if (!isValidIsoDate(endDate)) return { error: "End date is invalid." };
  if (endDate < startDate) {
    return { error: "End date must be on or after the start date." };
  }
  if (!ACTIVITY_TYPES.includes(activityType)) {
    return { error: "Activity type is invalid." };
  }
  if (!STATUSES.includes(status)) {
    return { error: "Status is invalid." };
  }

  const supabase = await createClient();

  // RLS restricts this update to sessions of the user's own courses.
  const { data, error } = await supabase
    .from("tuton_sessions")
    .update({
      title,
      start_date: startDate,
      end_date: endDate,
      material_label: materialLabel || null,
      activity_label: activityLabel || null,
      activity_type: activityType,
      status,
      notes: notes || null,
    })
    .eq("id", sessionId)
    .select("course_id")
    .maybeSingle();

  if (error) return { error: friendly(error.message) };
  if (!data) return { error: "Session not found." };

  revalidatePath("/tuton");
  revalidatePath(`/courses/${data.course_id}/tuton`);
  return {};
}
