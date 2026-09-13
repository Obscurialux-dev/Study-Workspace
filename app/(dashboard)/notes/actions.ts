"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ActionResult = {
  error?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function friendly(message: string) {
  if (message.includes("foreign key")) {
    return "The selected course or related material does not exist.";
  }
  if (message.includes("check constraint")) {
    return "One of the values is not allowed.";
  }
  return "Could not save the note. Please try again.";
}

function readOptional(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function readNullableUuid(formData: FormData, key: string) {
  const value = readOptional(formData, key);
  if (!value) return null;
  if (!UUID_RE.test(value)) throw new Error("invalid");
  return value;
}

function readNoteFields(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    content: readOptional(formData, "content"),
    course_id: readNullableUuid(formData, "course_id"),
    material_id: readNullableUuid(formData, "material_id"),
  };
}

export async function createNote(formData: FormData): Promise<ActionResult> {
  let fields: ReturnType<typeof readNoteFields>;
  try {
    fields = readNoteFields(formData);
  } catch {
    return { error: "Invalid course or material." };
  }
  if (!fields.title) return { error: "Title is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase.from("notes").insert({
    user_id: user.id, // from the server session, never from the client
    title: fields.title,
    content: fields.content,
    course_id: fields.course_id,
    material_id: fields.material_id,
  });

  if (error) return { error: friendly(error.message) };

  revalidatePath("/notes");
  if (fields.course_id) {
    revalidatePath(`/courses/${fields.course_id}/notes`);
  }
  return {};
}

export async function updateNote(
  noteId: string,
  formData: FormData
): Promise<ActionResult> {
  let fields: ReturnType<typeof readNoteFields>;
  try {
    fields = readNoteFields(formData);
  } catch {
    return { error: "Invalid course or material." };
  }
  if (!fields.title) return { error: "Title is required." };

  const supabase = await createClient();

  // RLS restricts this update to the user's own rows.
  const { data: current, error: currentError } = await supabase
    .from("notes")
    .select("course_id")
    .eq("id", noteId)
    .maybeSingle();

  if (currentError) return { error: friendly(currentError.message) };
  if (!current) return { error: "Note not found." };

  const { error } = await supabase
    .from("notes")
    .update({
      title: fields.title,
      content: fields.content,
      course_id: fields.course_id,
      material_id: fields.material_id,
    })
    .eq("id", noteId);

  if (error) return { error: friendly(error.message) };

  revalidatePath("/notes");
  if (current.course_id) {
    revalidatePath(`/courses/${current.course_id}/notes`);
  }
  if (fields.course_id) {
    revalidatePath(`/courses/${fields.course_id}/notes`);
  }
  return {};
}

export async function deleteNote(noteId: string): Promise<ActionResult> {
  const supabase = await createClient();

  // RLS restricts this delete to the user's own rows.
  const { data: current, error: currentError } = await supabase
    .from("notes")
    .select("course_id")
    .eq("id", noteId)
    .maybeSingle();

  if (currentError) return { error: friendly(currentError.message) };
  if (!current) return { error: "Note not found." };

  const { error } = await supabase.from("notes").delete().eq("id", noteId);

  if (error) return { error: friendly(error.message) };

  revalidatePath("/notes");
  if (current.course_id) {
    revalidatePath(`/courses/${current.course_id}/notes`);
  }
  return {};
}
