"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ActionResult = {
  error?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = ["not_started", "in_progress", "completed"];

function friendly(message: string) {
  if (message.includes("foreign key")) {
    return "The selected course or session does not exist.";
  }
  if (message.includes("check constraint")) {
    return "One of the values is not allowed (status or dates).";
  }
  return "Could not save the discussion. Please try again.";
}

function readOptional(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
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

function isValidUrl(value: string | null) {
  if (!value) return true;
  return /^https?:\/\/.+/i.test(value);
}

function readDiscussionFields(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    session_id: readOptional(formData, "session_id"),
    deadline: String(formData.get("deadline") ?? "").trim(),
    external_url: readOptional(formData, "external_url"),
    response_text: readOptional(formData, "response_text"),
    status: String(formData.get("status") ?? "").trim(),
  };
}

function validateFields(
  fields: ReturnType<typeof readDiscussionFields>
): string | null {
  if (!fields.title) return "Title is required.";
  if (!isValidIsoDate(fields.deadline)) return "Deadline is invalid.";
  if (!STATUSES.includes(fields.status)) return "Status is invalid.";
  if (fields.session_id && !UUID_RE.test(fields.session_id)) {
    return "Invalid session.";
  }
  if (!isValidUrl(fields.external_url)) {
    return "The Tuton link must start with http:// or https://";
  }
  return null;
}

export async function createDiscussion(
  courseId: string,
  formData: FormData
): Promise<ActionResult> {
  const fields = readDiscussionFields(formData);
  const validationError = validateFields(fields);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase.from("discussions").insert({
    user_id: user.id, // from the server session, never from the client
    course_id: courseId,
    title: fields.title,
    session_id: fields.session_id,
    deadline: fields.deadline,
    external_url: fields.external_url,
    response_text: fields.response_text,
    status: fields.status,
  });

  if (error) return { error: friendly(error.message) };

  revalidatePath(`/courses/${courseId}/discussions`);
  return {};
}

export async function updateDiscussion(
  discussionId: string,
  formData: FormData
): Promise<ActionResult> {
  const fields = readDiscussionFields(formData);
  const validationError = validateFields(fields);
  if (validationError) return { error: validationError };

  const supabase = await createClient();

  // RLS restricts this update to the user's own rows.
  const { data: current, error: currentError } = await supabase
    .from("discussions")
    .select("course_id")
    .eq("id", discussionId)
    .maybeSingle();

  if (currentError) return { error: friendly(currentError.message) };
  if (!current) return { error: "Discussion not found." };

  const { error } = await supabase
    .from("discussions")
    .update({
      title: fields.title,
      session_id: fields.session_id,
      deadline: fields.deadline,
      external_url: fields.external_url,
      response_text: fields.response_text,
      status: fields.status,
    })
    .eq("id", discussionId);

  if (error) return { error: friendly(error.message) };

  revalidatePath(`/courses/${current.course_id}/discussions`);
  return {};
}

export async function deleteDiscussion(
  discussionId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  // RLS restricts this delete to the user's own rows.
  const { data: current, error: currentError } = await supabase
    .from("discussions")
    .select("course_id")
    .eq("id", discussionId)
    .maybeSingle();

  if (currentError) return { error: friendly(currentError.message) };
  if (!current) return { error: "Discussion not found." };

  const { error } = await supabase
    .from("discussions")
    .delete()
    .eq("id", discussionId);

  if (error) return { error: friendly(error.message) };

  revalidatePath(`/courses/${current.course_id}/discussions`);
  return {};
}
