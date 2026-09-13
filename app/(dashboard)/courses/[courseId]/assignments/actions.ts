"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { WORKSPACE_BUCKET } from "@/lib/storage";

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
  return "Could not save the assignment. Please try again.";
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

async function removeFileQuietly(path: string | null) {
  if (!path) return;
  const supabase = await createClient();
  await supabase.storage.from(WORKSPACE_BUCKET).remove([path]);
}

async function assertOwnFilePath(filePath: string | null) {
  if (!filePath) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !filePath.startsWith(`${user.id}/`)) {
    return "Invalid file.";
  }
  return null;
}

function readAssignmentFields(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    description: readOptional(formData, "description"),
    session_id: readOptional(formData, "session_id"),
    deadline: String(formData.get("deadline") ?? "").trim(),
    status: String(formData.get("status") ?? "").trim(),
    external_url: readOptional(formData, "external_url"),
  };
}

function validateFields(
  fields: ReturnType<typeof readAssignmentFields>
): string | null {
  if (!fields.title) return "Title is required.";
  if (!isValidIsoDate(fields.deadline)) return "Deadline is invalid.";
  if (!STATUSES.includes(fields.status)) return "Status is invalid.";
  if (fields.session_id && !UUID_RE.test(fields.session_id)) {
    return "Invalid session.";
  }
  if (!isValidUrl(fields.external_url)) {
    return "External link must start with http:// or https://";
  }
  return null;
}

export async function createAssignment(
  courseId: string,
  formData: FormData
): Promise<ActionResult> {
  const fields = readAssignmentFields(formData);
  const validationError = validateFields(fields);
  if (validationError) return { error: validationError };

  const filePath = readOptional(formData, "file_path");
  const fileError = await assertOwnFilePath(filePath);
  if (fileError) return { error: fileError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase.from("assignments").insert({
    user_id: user.id, // from the server session, never from the client
    course_id: courseId,
    title: fields.title,
    description: fields.description,
    session_id: fields.session_id,
    deadline: fields.deadline,
    status: fields.status,
    external_url: fields.external_url,
    file_path: filePath,
  });

  if (error) return { error: friendly(error.message) };

  revalidatePath(`/courses/${courseId}/assignments`);
  return {};
}

export async function updateAssignment(
  assignmentId: string,
  formData: FormData
): Promise<ActionResult> {
  const fields = readAssignmentFields(formData);
  const validationError = validateFields(fields);
  if (validationError) return { error: validationError };

  const newFilePath = readOptional(formData, "file_path");
  const fileError = await assertOwnFilePath(newFilePath);
  if (fileError) return { error: fileError };

  const supabase = await createClient();

  // RLS restricts this read/update to the user's own rows.
  const { data: current, error: currentError } = await supabase
    .from("assignments")
    .select("course_id, file_path")
    .eq("id", assignmentId)
    .maybeSingle();

  if (currentError) return { error: friendly(currentError.message) };
  if (!current) return { error: "Assignment not found." };

  const { error } = await supabase
    .from("assignments")
    .update({
      title: fields.title,
      description: fields.description,
      session_id: fields.session_id,
      deadline: fields.deadline,
      status: fields.status,
      external_url: fields.external_url,
      file_path: newFilePath,
    })
    .eq("id", assignmentId);

  if (error) return { error: friendly(error.message) };

  if (current.file_path && current.file_path !== newFilePath) {
    await removeFileQuietly(current.file_path);
  }

  revalidatePath(`/courses/${current.course_id}/assignments`);
  return {};
}

export async function deleteAssignment(
  assignmentId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  // RLS restricts this read/delete to the user's own rows.
  const { data: current, error: currentError } = await supabase
    .from("assignments")
    .select("course_id, file_path")
    .eq("id", assignmentId)
    .maybeSingle();

  if (currentError) return { error: friendly(currentError.message) };
  if (!current) return { error: "Assignment not found." };

  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("id", assignmentId);

  if (error) return { error: friendly(error.message) };

  await removeFileQuietly(current.file_path);

  revalidatePath(`/courses/${current.course_id}/assignments`);
  return {};
}

/** Returns a short-lived signed URL for a file owned by the current user. */
export async function getAssignmentFileUrl(
  filePath: string
): Promise<{ error?: string; url?: string }> {
  const fileError = await assertOwnFilePath(filePath);
  if (fileError) return { error: fileError };

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(WORKSPACE_BUCKET)
    .createSignedUrl(filePath, 300);

  if (error || !data) return { error: "Could not open the file." };
  return { url: data.signedUrl };
}
