"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { WORKSPACE_BUCKET } from "@/lib/storage";

export type ActionResult = {
  error?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function friendly(message: string) {
  if (message.includes("duplicate key")) {
    return "This record already exists.";
  }
  if (message.includes("foreign key")) {
    return "The selected course, session, or related record does not exist.";
  }
  if (message.includes("check constraint")) {
    return "One of the values is not allowed.";
  }
  return "Could not save. Please try again.";
}

function readOptional(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function readSessionId(formData: FormData) {
  const value = readOptional(formData, "session_id");
  if (!value) return null;
  if (!UUID_RE.test(value)) {
    throw new Error("Invalid session.");
  }
  return value;
}

/** Removes a workspace file (best effort; storage errors are ignored). */
async function removeFileQuietly(path: string | null) {
  if (!path) return;
  const supabase = await createClient();
  await supabase.storage.from(WORKSPACE_BUCKET).remove([path]);
}

/** Validates that a file path belongs to the signed-in user's folder. */
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

export async function createMaterial(
  courseId: string,
  formData: FormData
): Promise<ActionResult> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Title is required." };

  let sessionId: string | null;
  try {
    sessionId = readSessionId(formData);
  } catch {
    return { error: "Invalid session." };
  }

  const filePath = readOptional(formData, "file_path");
  const fileError = await assertOwnFilePath(filePath);
  if (fileError) return { error: fileError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase.from("materials").insert({
    user_id: user.id, // from the server session, never from the client
    course_id: courseId,
    title,
    module_name: readOptional(formData, "module_name"),
    topic: readOptional(formData, "topic"),
    content: readOptional(formData, "content"),
    source: readOptional(formData, "source"),
    session_id: sessionId,
    file_path: filePath,
  });

  if (error) return { error: friendly(error.message) };

  revalidatePath("/materials");
  revalidatePath(`/courses/${courseId}/materials`);
  revalidatePath("/notes");
  return {};
}

export async function updateMaterial(
  materialId: string,
  formData: FormData
): Promise<ActionResult> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Title is required." };

  let sessionId: string | null;
  try {
    sessionId = readSessionId(formData);
  } catch {
    return { error: "Invalid session." };
  }

  const newFilePath = readOptional(formData, "file_path");
  const fileError = await assertOwnFilePath(newFilePath);
  if (fileError) return { error: fileError };

  const supabase = await createClient();

  // RLS restricts this read/update to the user's own rows.
  const { data: current, error: currentError } = await supabase
    .from("materials")
    .select("course_id, file_path")
    .eq("id", materialId)
    .maybeSingle();

  if (currentError) return { error: friendly(currentError.message) };
  if (!current) return { error: "Material not found." };

  const { error } = await supabase
    .from("materials")
    .update({
      title,
      module_name: readOptional(formData, "module_name"),
      topic: readOptional(formData, "topic"),
      content: readOptional(formData, "content"),
      source: readOptional(formData, "source"),
      session_id: sessionId,
      file_path: newFilePath,
    })
    .eq("id", materialId);

  if (error) return { error: friendly(error.message) };

  // Replace: clean up the old object when the path changed.
  if (current.file_path && current.file_path !== newFilePath) {
    await removeFileQuietly(current.file_path);
  }

  revalidatePath("/materials");
  revalidatePath(`/courses/${current.course_id}/materials`);
  revalidatePath("/notes");
  return {};
}

export async function deleteMaterial(
  materialId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  // RLS restricts this read/delete to the user's own rows.
  const { data: current, error: currentError } = await supabase
    .from("materials")
    .select("course_id, file_path")
    .eq("id", materialId)
    .maybeSingle();

  if (currentError) return { error: friendly(currentError.message) };
  if (!current) return { error: "Material not found." };

  const { error } = await supabase
    .from("materials")
    .delete()
    .eq("id", materialId);

  if (error) return { error: friendly(error.message) };

  await removeFileQuietly(current.file_path);

  revalidatePath("/materials");
  revalidatePath(`/courses/${current.course_id}/materials`);
  revalidatePath("/notes");
  return {};
}

/** Returns a short-lived signed URL for a file owned by the current user. */
export async function getWorkspaceFileUrl(
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
