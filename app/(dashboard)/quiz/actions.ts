"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_QUESTION_COUNT,
  MAX_QUESTION_COUNT,
  isAnswerLetter,
  quizScore,
  shuffleIds,
} from "@/lib/quiz";

export type ActionResult = {
  error?: string;
};

export type StartPracticeResult = {
  error?: string;
  attemptId?: string;
};

type ServerClient = Awaited<ReturnType<typeof createClient>>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function friendly(message: string) {
  if (message.includes("foreign key")) {
    return "The selected course, exam topic, or material does not exist.";
  }
  if (message.includes("check constraint")) {
    return "One of the values is not allowed.";
  }
  if (message.includes("duplicate key")) {
    return "This record already exists.";
  }
  return "Could not save the question. Please try again.";
}

function readOptional(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

/** Requires a user session; never trusts a client-provided user id. */
async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/* ------------------------------ question bank ----------------------------- */

type QuestionFields = {
  courseId: string | null;
  examTopicId: string | null;
  materialId: string | null;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string | null;
};

/** Reads and validates the raw question form values (A/B/C/D only). */
function readQuestionFields(formData: FormData): {
  fields: QuestionFields;
  error: string | null;
} {
  const fields: QuestionFields = {
    courseId: readOptional(formData, "course_id"),
    examTopicId: readOptional(formData, "exam_topic_id"),
    materialId: readOptional(formData, "material_id"),
    question: String(formData.get("question") ?? "").trim(),
    optionA: String(formData.get("option_a") ?? "").trim(),
    optionB: String(formData.get("option_b") ?? "").trim(),
    optionC: String(formData.get("option_c") ?? "").trim(),
    optionD: String(formData.get("option_d") ?? "").trim(),
    correctAnswer: String(formData.get("correct_answer") ?? "")
      .trim()
      .toUpperCase(),
    explanation: readOptional(formData, "explanation"),
  };

  if (!fields.courseId) return { fields, error: "A course is required." };
  if (!UUID_RE.test(fields.courseId)) {
    return { fields, error: "Invalid course." };
  }
  if (fields.examTopicId && !UUID_RE.test(fields.examTopicId)) {
    return { fields, error: "Invalid exam topic." };
  }
  if (fields.materialId && !UUID_RE.test(fields.materialId)) {
    return { fields, error: "Invalid material." };
  }
  if (!fields.question) return { fields, error: "Question text is required." };
  if (!fields.optionA || !fields.optionB || !fields.optionC || !fields.optionD) {
    return { fields, error: "All four options (A, B, C, D) are required." };
  }
  if (!isAnswerLetter(fields.correctAnswer)) {
    return { fields, error: "The correct answer must be A, B, C, or D." };
  }
  return { fields, error: null };
}

/**
 * Server-side relation validation. The course must belong to the signed-in
 * user, and the optional exam topic / material must belong to the user AND
 * to the selected course — cross-course links are refused. RLS scopes every
 * read to the signed-in user as well.
 */
async function validateRelations(
  supabase: ServerClient,
  userId: string,
  relations: {
    courseId: string;
    examTopicId: string | null;
    materialId: string | null;
  }
): Promise<string | null> {
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id")
    .eq("id", relations.courseId)
    .eq("user_id", userId)
    .maybeSingle();

  if (courseError) {
    return "Could not verify the selected course. Please try again.";
  }
  if (!course) return "The selected course was not found.";

  if (relations.examTopicId) {
    const { data: topic, error } = await supabase
      .from("exam_topics")
      .select("id, course_id")
      .eq("id", relations.examTopicId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      return "Could not verify the selected exam topic. Please try again.";
    }
    if (!topic) return "The selected exam topic was not found.";
    if (topic.course_id !== relations.courseId) {
      return "The selected exam topic belongs to a different course.";
    }
  }

  if (relations.materialId) {
    const { data: material, error } = await supabase
      .from("materials")
      .select("id, course_id")
      .eq("id", relations.materialId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      return "Could not verify the selected material. Please try again.";
    }
    if (!material) return "The selected material was not found.";
    if (material.course_id !== relations.courseId) {
      return "The selected material belongs to a different course.";
    }
  }

  return null;
}

export async function createQuestion(
  formData: FormData
): Promise<ActionResult> {
  const { fields, error: validationError } = readQuestionFields(formData);
  if (validationError) return { error: validationError };

  const { supabase, user } = await requireUser();
  if (!user) return { error: "You must be signed in." };

  const relationError = await validateRelations(supabase, user.id, {
    courseId: fields.courseId!,
    examTopicId: fields.examTopicId,
    materialId: fields.materialId,
  });
  if (relationError) return { error: relationError };

  const { error } = await supabase.from("questions").insert({
    user_id: user.id, // from the server session, never from the client
    course_id: fields.courseId!,
    exam_topic_id: fields.examTopicId,
    material_id: fields.materialId,
    question: fields.question,
    option_a: fields.optionA,
    option_b: fields.optionB,
    option_c: fields.optionC,
    option_d: fields.optionD,
    correct_answer: fields.correctAnswer,
    explanation: fields.explanation,
  });

  if (error) return { error: friendly(error.message) };

  revalidatePath("/quiz");
  revalidatePath("/quiz/questions");
  revalidatePath("/quiz/practice");
  return {};
}

export async function updateQuestion(
  questionId: string,
  formData: FormData
): Promise<ActionResult> {
  if (!UUID_RE.test(questionId)) return { error: "Question not found." };

  const { fields, error: validationError } = readQuestionFields(formData);
  if (validationError) return { error: validationError };

  const { supabase, user } = await requireUser();
  if (!user) return { error: "You must be signed in." };

  const relationError = await validateRelations(supabase, user.id, {
    courseId: fields.courseId!,
    examTopicId: fields.examTopicId,
    materialId: fields.materialId,
  });
  if (relationError) return { error: relationError };

  // RLS restricts this update to the user's own rows.
  const { error } = await supabase
    .from("questions")
    .update({
      course_id: fields.courseId!,
      exam_topic_id: fields.examTopicId,
      material_id: fields.materialId,
      question: fields.question,
      option_a: fields.optionA,
      option_b: fields.optionB,
      option_c: fields.optionC,
      option_d: fields.optionD,
      correct_answer: fields.correctAnswer,
      explanation: fields.explanation,
    })
    .eq("id", questionId);

  if (error) return { error: friendly(error.message) };

  revalidatePath("/quiz");
  revalidatePath("/quiz/questions");
  revalidatePath("/quiz/practice");
  return {};
}

export async function deleteQuestion(questionId: string): Promise<ActionResult> {
  if (!UUID_RE.test(questionId)) return { error: "Question not found." };

  const { supabase, user } = await requireUser();
  if (!user) return { error: "You must be signed in." };

  // RLS restricts this delete to the user's own rows. Answers already recorded
  // in past attempts are removed with the question (they can no longer be
  // reviewed); the attempt keeps its stored totals and score.
  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("id", questionId);

  if (error) return { error: friendly(error.message) };

  revalidatePath("/quiz");
  revalidatePath("/quiz/questions");
  revalidatePath("/quiz/practice");
  revalidatePath("/quiz/attempts");
  return {};
}

/* ----------------------------- practice attempt ---------------------------- */

/** Reads and validates the practice setup form. */
function readPracticeSetup(formData: FormData): {
  courseId: string | null;
  examTopicId: string | null;
  materialId: string | null;
  questionCount: number;
  error: string | null;
} {
  const courseId = readOptional(formData, "course_id");
  const examTopicId = readOptional(formData, "exam_topic_id");
  const materialId = readOptional(formData, "material_id");
  const rawCount = String(formData.get("question_count") ?? "").trim();
  const questionCount = rawCount
    ? Number(rawCount)
    : DEFAULT_QUESTION_COUNT;

  const empty = {
    courseId,
    examTopicId,
    materialId,
    questionCount: DEFAULT_QUESTION_COUNT,
  };

  if (!courseId || !UUID_RE.test(courseId)) {
    return { ...empty, error: "A course is required." };
  }
  if (examTopicId && !UUID_RE.test(examTopicId)) {
    return { ...empty, error: "Invalid exam topic." };
  }
  if (materialId && !UUID_RE.test(materialId)) {
    return { ...empty, error: "Invalid material." };
  }
  if (
    !Number.isInteger(questionCount) ||
    questionCount < 1 ||
    questionCount > MAX_QUESTION_COUNT
  ) {
    return {
      ...empty,
      error: `Question count must be a whole number between 1 and ${MAX_QUESTION_COUNT}.`,
    };
  }

  return { courseId, examTopicId, materialId, questionCount, error: null };
}

/**
 * Starts a practice attempt: picks the matching questions of the signed-in
 * user (random order, no adaptive algorithm), stores the attempt and the
 * questions it uses, and returns the attempt id for the quiz runner.
 *
 * Fewer matching questions than requested is never an error: the attempt uses
 * what is available. An empty selection is refused, so no empty attempt is
 * ever created.
 */
export async function startPracticeQuiz(
  formData: FormData
): Promise<StartPracticeResult> {
  const setup = readPracticeSetup(formData);
  if (setup.error) return { error: setup.error };

  const { supabase, user } = await requireUser();
  if (!user) return { error: "You must be signed in." };

  const courseId = setup.courseId!;
  const relationError = await validateRelations(supabase, user.id, {
    courseId,
    examTopicId: setup.examTopicId,
    materialId: setup.materialId,
  });
  if (relationError) return { error: relationError };

  // RLS scopes this read to the user's own questions.
  let query = supabase.from("questions").select("id").eq("course_id", courseId);
  if (setup.examTopicId) query = query.eq("exam_topic_id", setup.examTopicId);
  if (setup.materialId) query = query.eq("material_id", setup.materialId);

  const { data: matching, error: questionsError } = await query.order(
    "created_at",
    { ascending: true }
  );

  if (questionsError) {
    return { error: "Could not load your questions. Please try again." };
  }

  const available = (matching ?? []).map((question) => question.id);
  if (available.length === 0) {
    return {
      error:
        "No questions match this selection yet. Add questions to your question bank first.",
    };
  }

  const selected = shuffleIds(available).slice(0, setup.questionCount);

  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .insert({
      user_id: user.id, // from the server session, never from the client
      course_id: courseId,
      total_questions: selected.length,
      correct_answers: 0,
      score: 0,
    })
    .select("id")
    .maybeSingle();

  if (attemptError || !attempt) {
    return { error: "Could not start the practice quiz. Please try again." };
  }

  const { error: answersError } = await supabase.from("quiz_answers").insert(
    selected.map((questionId, position) => ({
      attempt_id: attempt.id,
      question_id: questionId,
      position,
      selected_answer: null,
      is_correct: null,
    }))
  );

  if (answersError) {
    // Never leave an empty attempt behind.
    await supabase.from("quiz_attempts").delete().eq("id", attempt.id);
    return { error: "Could not start the practice quiz. Please try again." };
  }

  revalidatePath("/quiz");
  revalidatePath("/quiz/attempts");
  return { attemptId: attempt.id };
}

/* -------------------------------- answering ------------------------------- */

/**
 * Persists one answer while the quiz runs. The attempt must be open (RLS
 * enforces the same rule in the database), and `is_correct` is deliberately
 * NOT touched: grading only happens on submit, so an active quiz can never
 * reveal whether an answer was right.
 */
export async function saveQuizAnswer(
  attemptId: string,
  questionId: string,
  selectedAnswer: string | null
): Promise<ActionResult> {
  if (!UUID_RE.test(attemptId) || !UUID_RE.test(questionId)) {
    return { error: "This question is not part of the quiz." };
  }
  if (selectedAnswer !== null && !isAnswerLetter(selectedAnswer)) {
    return { error: "The selected answer must be A, B, C, or D." };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "You must be signed in." };

  // RLS restricts this read to the user's own attempts.
  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .select("id, completed_at")
    .eq("id", attemptId)
    .maybeSingle();

  if (attemptError) {
    return { error: "Could not save your answer. Please try again." };
  }
  if (!attempt) return { error: "This quiz attempt was not found." };
  if (attempt.completed_at) {
    return { error: "This quiz has already been submitted." };
  }

  const { data: updated, error } = await supabase
    .from("quiz_answers")
    .update({ selected_answer: selectedAnswer })
    .eq("attempt_id", attemptId)
    .eq("question_id", questionId)
    .select("id")
    .maybeSingle();

  if (error) return { error: "Could not save your answer. Please try again." };
  if (!updated) return { error: "This question is not part of the quiz." };

  return {};
}

/* --------------------------------- scoring -------------------------------- */

/**
 * Submits an attempt. The result is computed entirely on the server from the
 * stored answers and the stored correct answers — a client-provided score is
 * never accepted. Unanswered questions count as incorrect.
 */
export async function submitQuizAttempt(
  attemptId: string
): Promise<ActionResult> {
  if (!UUID_RE.test(attemptId)) return { error: "Quiz attempt not found." };

  const { supabase, user } = await requireUser();
  if (!user) return { error: "You must be signed in." };

  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .select("id, completed_at")
    .eq("id", attemptId)
    .maybeSingle();

  if (attemptError) {
    return { error: "Could not submit the quiz. Please try again." };
  }
  if (!attempt) return { error: "Quiz attempt not found." };
  if (attempt.completed_at) {
    return { error: "This quiz has already been submitted." };
  }

  const { data: answerRows, error: answersError } = await supabase
    .from("quiz_answers")
    .select("id, question_id, selected_answer")
    .eq("attempt_id", attemptId)
    .order("position", { ascending: true });

  if (answersError) {
    return { error: "Could not submit the quiz. Please try again." };
  }

  const answers = answerRows ?? [];
  const total = answers.length;
  if (total === 0) {
    return {
      error: "This attempt has no questions left. Start a new practice quiz.",
    };
  }

  const { data: questionRows, error: questionsError } = await supabase
    .from("questions")
    .select("id, correct_answer")
    .in(
      "id",
      answers.map((answer) => answer.question_id)
    );

  if (questionsError) {
    return { error: "Could not submit the quiz. Please try again." };
  }

  const correctByQuestion = new Map(
    (questionRows ?? []).map((question) => [
      question.id,
      question.correct_answer,
    ])
  );

  let correctCount = 0;
  const graded = answers.map((answer) => {
    // A question that no longer exists can never be correct.
    const correctAnswer = correctByQuestion.get(answer.question_id) ?? null;
    const isCorrect =
      answer.selected_answer !== null && answer.selected_answer === correctAnswer;
    if (isCorrect) correctCount += 1;
    return { id: answer.id, isCorrect };
  });

  // Grade the answers first: RLS only allows answer writes while the attempt
  // is still open (completed_at is null). Rows are grouped by result so this
  // stays two statements regardless of the number of questions.
  const correctIds = graded.filter((row) => row.isCorrect).map((row) => row.id);
  const incorrectIds = graded
    .filter((row) => !row.isCorrect)
    .map((row) => row.id);

  if (correctIds.length > 0) {
    const { error } = await supabase
      .from("quiz_answers")
      .update({ is_correct: true })
      .in("id", correctIds);
    if (error) return { error: "Could not submit the quiz. Please try again." };
  }

  if (incorrectIds.length > 0) {
    const { error } = await supabase
      .from("quiz_answers")
      .update({ is_correct: false })
      .in("id", incorrectIds);
    if (error) return { error: "Could not submit the quiz. Please try again." };
  }

  const { error: completeError } = await supabase
    .from("quiz_attempts")
    .update({
      total_questions: total,
      correct_answers: correctCount,
      score: quizScore(correctCount, total),
      completed_at: new Date().toISOString(),
    })
    .eq("id", attemptId);

  if (completeError) {
    return { error: "Could not submit the quiz. Please try again." };
  }

  revalidatePath("/quiz");
  revalidatePath("/quiz/practice");
  revalidatePath("/quiz/attempts");
  revalidatePath(`/quiz/attempts/${attemptId}`);
  return {};
}