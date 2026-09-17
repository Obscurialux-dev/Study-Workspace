import type { Question, QuizAttempt } from "@/types/database";

/**
 * Quiz & Practice helpers (Phase 8).
 *
 * Deterministic, pure functions only. There is NO AI in this phase: no
 * question generation, no embeddings/RAG, no document parsing, no timer and
 * no adaptive testing. Questions are authored manually and the application
 * only stores and runs the question bank.
 *
 * Quiz scores are PRACTICE ONLY: they never feed the academic grade
 * calculations in `lib/exam.ts`.
 */

/* --------------------------------- answers -------------------------------- */

export const ANSWER_LETTERS = ["A", "B", "C", "D"] as const;

export type AnswerLetter = (typeof ANSWER_LETTERS)[number];

/** The four A–D options of a question record. */
export type QuestionOptions = Pick<
  Question,
  "option_a" | "option_b" | "option_c" | "option_d"
>;

/** True when a value is one of the allowed answer letters (never trusts input). */
export function isAnswerLetter(value: unknown): value is AnswerLetter {
  return (
    typeof value === "string" &&
    (ANSWER_LETTERS as readonly string[]).includes(value)
  );
}

/** Text of one of the four options. */
export function optionText(
  question: QuestionOptions,
  letter: AnswerLetter
): string {
  switch (letter) {
    case "A":
      return question.option_a;
    case "B":
      return question.option_b;
    case "C":
      return question.option_c;
    case "D":
      return question.option_d;
  }
}

/* ------------------------------ practice setup ----------------------------- */

/** Default number of questions when the user does not pick one. */
export const DEFAULT_QUESTION_COUNT = 10;

/** Upper bound for one practice quiz (keeps an attempt to a sane size). */
export const MAX_QUESTION_COUNT = 100;

/* --------------------------------- scoring -------------------------------- */

/**
 * Practice score: correct / total × 100, rounded to two decimals.
 * `total` is never 0 for a stored attempt (empty attempts are refused), and
 * is guarded here so the value can never be NaN/Infinity.
 */
export function quizScore(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 10000) / 100;
}

/** "66.7" — one decimal for display, trailing ".0" trimmed. */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/**
 * Fisher–Yates shuffle of question ids (random question order, no adaptive
 * algorithm). Returns a new array and never mutates the input.
 */
export function shuffleIds(ids: string[]): string[] {
  const shuffled = [...ids];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = shuffled[i];
    const b = shuffled[j];
    shuffled[i] = b;
    shuffled[j] = a;
  }
  return shuffled;
}

/* --------------------------------- attempts ------------------------------- */

export type QuizAttemptStatus = "completed" | "in_progress";

/** True while the attempt can still be answered (no timer exists). */
export function attemptStatus(
  attempt: Pick<QuizAttempt, "completed_at">
): QuizAttemptStatus {
  return attempt.completed_at ? "completed" : "in_progress";
}

/**
 * Formats an attempt timestamp as "17 Sep 2026, 21:05" in Asia/Jakarta, so
 * server and browser render the same string regardless of their timezone.
 */
export function formatAttemptDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}