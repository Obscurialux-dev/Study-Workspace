"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ActionResult = {
  error?: string;
};

const REQUIRED_FIELD_MESSAGE = {
  code: "Course code is required.",
  name: "Course name is required.",
};

/** Map raw Supabase errors to clearer, user-facing messages. */
function friendly(message: string) {
  if (message.includes("duplicate key")) {
    return "A course with this identifier already exists.";
  }
  if (message.includes("foreign key")) {
    return "This operation is not allowed.";
  }
  return "Could not save the course. Please try again.";
}

function readOptional(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function validateRequired(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();

  if (!code) return REQUIRED_FIELD_MESSAGE.code;
  if (!name) return REQUIRED_FIELD_MESSAGE.name;

  return null;
}

function readCourseFields(formData: FormData) {
  return {
    code: String(formData.get("code") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    description: readOptional(formData, "description"),
    semester: readOptional(formData, "semester"),
    color: readOptional(formData, "color"),
    icon: readOptional(formData, "icon"),
  };
}

export async function createCourse(
  formData: FormData
): Promise<ActionResult> {
  const validationError = validateRequired(formData);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to create a course." };
  }

  const fields = readCourseFields(formData);
  const { error } = await supabase.from("courses").insert({
    user_id: user.id, // from the server session, never from the client
    ...fields,
  });

  if (error) return { error: friendly(error.message) };

  revalidatePath("/courses");
  return {};
}

export async function updateCourse(
  courseId: string,
  formData: FormData
): Promise<ActionResult> {
  const validationError = validateRequired(formData);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const fields = readCourseFields(formData);

  // RLS restricts this update to the user's own rows.
  const { data, error } = await supabase
    .from("courses")
    .update(fields)
    .eq("id", courseId)
    .select("id")
    .maybeSingle();

  if (error) return { error: friendly(error.message) };
  if (!data) return { error: "Course not found." };

  revalidatePath("/courses");
  revalidatePath(`/courses/${courseId}`);
  return {};
}

export async function deleteCourse(
  courseId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  // RLS restricts this delete to the user's own rows.
  const { data, error } = await supabase
    .from("courses")
    .delete()
    .eq("id", courseId)
    .select("id")
    .maybeSingle();

  if (error) return { error: friendly(error.message) };
  if (!data) return { error: "Course not found." };

  revalidatePath("/courses");
  return {};
}
