"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ActionResult = {
  error?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOPIC_STATUSES = ["not_started", "in_progress", "completed"];

function readOptional(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

/** Parses a non-negative decimal score, or null when the field is empty. */
function readScore(
  formData: FormData,
  key: string
): { value: number | null; error: string | null } {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return { value: null, error: null };
  const value = Number(raw.replace(",", "."));
  if (!Number.isFinite(value) || value < 0) {
    return { value: null, error: "invalid" };
  }
  return { value, error: null };
}

/** Requires a user session; never trusts a client-provided user id. */
async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Validates score/max fields shared by discussions and assignments. */
function validateScoreFields(
  score: { value: number | null; error: string | null },
  scoreMax: { value: number | null; error: string | null }
): { error: string | null; score: number | null; scoreMax: number | null } {
  if (score.error) {
    return { error: "Score must be a number (0 or more).", score: null, scoreMax: null };
  }
  if (scoreMax.error) {
    return {
      error: "Max score must be a number greater than 0.",
      score: null,
      scoreMax: null,
    };
  }
  if (score.value !== null && scoreMax.value !== null && score.value > scoreMax.value) {
    return {
      error: "Score cannot be greater than the max score.",
      score: null,
      scoreMax: null,
    };
  }
  return { error: null, score: score.value, scoreMax: scoreMax.value };
}

/* ------------------------- discussion / assignment ------------------------ */

/**
 * Records (or clears) the tutor/lecturer score on an existing Discussion.
 * The discussion itself is not otherwise modified.
 */
export async function saveDiscussionScore(
  discussionId: string,
  formData: FormData
): Promise<ActionResult> {
  const validated = validateScoreFields(
    readScore(formData, "score"),
    readScore(formData, "score_max")
  );
  if (validated.error) return { error: validated.error };

  const { supabase, user } = await requireUser();
  if (!user) return { error: "You must be signed in." };

  // RLS restricts this update to the user's own rows.
  const { error } = await supabase
    .from("discussions")
    .update({
      score: validated.score,
      score_max: validated.scoreMax,
      feedback: readOptional(formData, "feedback"),
      // Cleared scores also lose their "recorded" timestamp.
      score_recorded_at: validated.score === null ? null : new Date().toISOString(),
    })
    .eq("id", discussionId);

  if (error) {
    return { error: "Could not save the discussion score. Please try again." };
  }

  revalidatePath("/exam");
  return {};
}

/** Records (or clears) the tutor/lecturer score on an existing Assignment. */
export async function saveAssignmentScore(
  assignmentId: string,
  formData: FormData
): Promise<ActionResult> {
  const validated = validateScoreFields(
    readScore(formData, "score"),
    readScore(formData, "score_max")
  );
  if (validated.error) return { error: validated.error };

  const { supabase, user } = await requireUser();
  if (!user) return { error: "You must be signed in." };

  // RLS restricts this update to the user's own rows.
  const { error } = await supabase
    .from("assignments")
    .update({
      score: validated.score,
      score_max: validated.scoreMax,
      feedback: readOptional(formData, "feedback"),
      score_recorded_at: validated.score === null ? null : new Date().toISOString(),
    })
    .eq("id", assignmentId);

  if (error) {
    return { error: "Could not save the assignment score. Please try again." };
  }

  revalidatePath("/exam");
  return {};
}

/* ---------------------------------- UAS ----------------------------------- */

/** Records (or clears) the UAS score for a course. Null = not entered. */
export async function saveUasScore(
  courseId: string,
  formData: FormData
): Promise<ActionResult> {
  const { value, error: scoreError } = readScore(formData, "uas_score");
  if (scoreError || (value !== null && value > 100)) {
    return { error: "UAS score must be a number between 0 and 100." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "You must be signed in." };

  // RLS restricts this update to the user's own course rows.
  const { error } = await supabase
    .from("courses")
    .update({ uas_score: value })
    .eq("id", courseId);

  if (error) return { error: "Could not save the UAS score. Please try again." };

  revalidatePath("/exam");
  return {};
}

/* ------------------------------- exam topics ------------------------------ */

function readTopicFields(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    description: readOptional(formData, "description"),
    notes: readOptional(formData, "notes"),
    status: String(formData.get("status") ?? "").trim(),
    material_id: readOptional(formData, "material_id"),
  };
}

function validateTopicFields(
  fields: ReturnType<typeof readTopicFields>
): string | null {
  if (!fields.title) return "Title is required.";
  if (!TOPIC_STATUSES.includes(fields.status)) return "Status is invalid.";
  if (fields.material_id && !UUID_RE.test(fields.material_id)) {
    return "Invalid material.";
  }
  return null;
}

export async function createExamTopic(
  courseId: string,
  formData: FormData
): Promise<ActionResult> {
  const fields = readTopicFields(formData);
  const validationError = validateTopicFields(fields);
  if (validationError) return { error: validationError };

  const { supabase, user } = await requireUser();
  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase.from("exam_topics").insert({
    user_id: user.id, // from the server session, never from the client
    course_id: courseId,
    title: fields.title,
    description: fields.description,
    notes: fields.notes,
    status: fields.status,
    material_id: fields.material_id,
  });

  if (error) return { error: "Could not save the topic. Please try again." };

  revalidatePath("/exam");
  return {};
}

export async function updateExamTopic(
  topicId: string,
  formData: FormData
): Promise<ActionResult> {
  const fields = readTopicFields(formData);
  const validationError = validateTopicFields(fields);
  if (validationError) return { error: validationError };

  const { supabase, user } = await requireUser();
  if (!user) return { error: "You must be signed in." };

  // RLS restricts this read/update to the user's own rows.
  const { error } = await supabase
    .from("exam_topics")
    .update({
      title: fields.title,
      description: fields.description,
      notes: fields.notes,
      status: fields.status,
      material_id: fields.material_id,
    })
    .eq("id", topicId);

  if (error) return { error: "Could not save the topic. Please try again." };

  revalidatePath("/exam");
  return {};
}

export async function deleteExamTopic(topicId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "You must be signed in." };

  // RLS restricts this delete to the user's own rows.
  const { error } = await supabase.from("exam_topics").delete().eq("id", topicId);

  if (error) return { error: "Could not delete the topic. Please try again." };

  revalidatePath("/exam");
  return {};
}

