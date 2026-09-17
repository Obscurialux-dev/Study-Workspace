import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { StatusBadge } from "@/components/shared/tuton-status";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/ui/error-state";
import {
  ANSWER_LETTERS,
  formatAttemptDate,
  formatPercent,
  isAnswerLetter,
  optionText,
  type AnswerLetter,
  type QuestionOptions,
} from "@/lib/quiz";
import { createClient } from "@/lib/supabase/server";

// Reads the auth session and RLS-scoped data; render per request.
export const dynamic = "force-dynamic";

export type ReviewRow = {
  position: number;
  text: string;
  options: QuestionOptions;
  selectedAnswer: AnswerLetter | null;
  correctAnswer: AnswerLetter | null;
  isCorrect: boolean;
  explanation: string | null;
};

type ReviewQuestion = QuestionOptions & {
  id: string;
  question: string;
  correct_answer: string;
  explanation: string | null;
};

export default async function QuizAttemptResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const supabase = await createClient();

  // RLS restricts this read to the user's own attempts; a foreign or invalid
  // id yields no row -> 404.
  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("id", attemptId)
    .maybeSingle();

  if (attemptError || !attempt) notFound();

  // An unfinished attempt must be answered first.
  if (!attempt.completed_at) redirect(`/quiz/practice/${attempt.id}`);

  const [{ data: course }, { data: answers, error: answersError }] =
    await Promise.all([
      supabase
        .from("courses")
        .select("id, code, name")
        .eq("id", attempt.course_id)
        .maybeSingle(),
      supabase
        .from("quiz_answers")
        .select("id, position, selected_answer, is_correct, question_id")
        .eq("attempt_id", attempt.id)
        .order("position", { ascending: true }),
    ]);

  const answerRows = answers ?? [];

  // After submitting, the correct answers and explanations may be shown.
  let questionsFailed = false;
  const questionsById = new Map<string, ReviewQuestion>();
  if (answerRows.length > 0) {
    const { data: questionRows, error: questionsError } = await supabase
      .from("questions")
      .select(
        "id, question, option_a, option_b, option_c, option_d, correct_answer, explanation"
      )
      .in(
        "id",
        answerRows.map((answer) => answer.question_id)
      );
    if (questionsError) {
      questionsFailed = true;
    } else {
      for (const question of questionRows ?? []) {
        questionsById.set(question.id, question);
      }
    }
  }

  const rows: ReviewRow[] = [];
  for (const answer of answerRows) {
    const question = questionsById.get(answer.question_id);
    if (!question) continue; // question was deleted from the bank
    rows.push({
      position: answer.position,
      text: question.question,
      options: {
        option_a: question.option_a,
        option_b: question.option_b,
        option_c: question.option_c,
        option_d: question.option_d,
      },
      selectedAnswer: isAnswerLetter(answer.selected_answer)
        ? answer.selected_answer
        : null,
      correctAnswer: isAnswerLetter(question.correct_answer)
        ? question.correct_answer
        : null,
      isCorrect: answer.is_correct === true,
      explanation: question.explanation,
    });
  }

  const heading = course ? `${course.code} — Quiz Result` : "Quiz Result";

  if (answersError || questionsFailed) {
    return (
      <>
        <PageHeader title={heading} />
        <ErrorState
          title="Could not load this result"
          message="An error occurred while loading the answers of this attempt. Please try again."
        />
      </>
    );
  }

  const missingQuestions = attempt.total_questions - rows.length;

  return (
    <div className="space-y-4">
      <PageHeader
        title={heading}
        description={course ? course.name : undefined}
        actions={
          <>
            <Link
              href={`/quiz/practice?course=${encodeURIComponent(attempt.course_id)}`}
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Practice again
            </Link>
            <Link
              href="/quiz/attempts"
              className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-700"
            >
              Back to history
            </Link>
          </>
        }
      />

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Score
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              {formatPercent(attempt.score)}%
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Correct answers
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              {attempt.correct_answers}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Total questions
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              {attempt.total_questions}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Status
            </p>
            <p className="mt-1">
              <StatusBadge status="completed" />
            </p>
          </div>
        </div>

        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
          <div className="flex gap-1">
            <dt>Started:</dt>
            <dd className="text-slate-700">
              {formatAttemptDate(attempt.started_at)}
            </dd>
          </div>
          <div className="flex gap-1">
            <dt>Submitted:</dt>
            <dd className="text-slate-700">
              {attempt.completed_at
                ? formatAttemptDate(attempt.completed_at)
                : "—"}
            </dd>
          </div>
        </dl>

        <p className="mt-3 text-xs text-slate-500">
          Practice score only: it is not part of your Tuton, UAS or final course
          score.
        </p>
        {missingQuestions > 0 ? (
          <p className="mt-2 text-xs text-amber-700">
            {missingQuestions} question{missingQuestions === 1 ? "" : "s"} from
            this attempt {missingQuestions === 1 ? "was" : "were"} deleted from
            your question bank, so {missingQuestions === 1 ? "it" : "they"} can
            no longer be reviewed.
          </p>
        ) : null}
      </section>

      <ReviewList rows={rows} />
    </div>
  );
}

/** Marker for one option row of the review (correct / user's wrong pick). */
function optionMarker(
  letter: AnswerLetter,
  row: ReviewRow
): { label: string; className: string } | null {
  if (row.correctAnswer === letter) {
    return {
      label:
        row.selectedAnswer === letter ? "Your answer · correct" : "Correct answer",
      className: "border-emerald-300 bg-emerald-50",
    };
  }
  if (row.selectedAnswer === letter) {
    return {
      label: "Your answer · incorrect",
      className: "border-red-300 bg-red-50",
    };
  }
  return null;
}

/** Per-question review, shown only after the attempt has been submitted. */
function ReviewList({ rows }: { rows: ReviewRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
        No answers are available for this attempt.
      </p>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Answer review
      </h2>
      <ol className="space-y-3">
        {rows.map((row) => (
          <li
            key={`${row.position}-${row.text}`}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="min-w-0 text-sm font-medium text-slate-900">
                {row.position + 1}. {row.text}
              </p>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  row.isCorrect
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {row.isCorrect ? "Correct" : "Incorrect"}
              </span>
            </div>

            <ul className="mt-3 space-y-2 text-sm">
              {ANSWER_LETTERS.map((letter) => {
                const marker = optionMarker(letter, row);
                return (
                  <li
                    key={letter}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 ${
                      marker ? marker.className : "border-slate-200"
                    }`}
                  >
                    <span className="min-w-0 text-slate-700">
                      <span className="font-semibold text-slate-900">
                        {letter}.
                      </span>{" "}
                      {optionText(row.options, letter)}
                    </span>
                    {marker ? (
                      <span className="shrink-0 text-xs font-medium text-slate-600">
                        {marker.label}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            <p className="mt-2 text-xs text-slate-500">
              Your answer: {row.selectedAnswer ?? "Not answered"} · Correct
              answer: {row.correctAnswer ?? "—"}
            </p>

            {row.explanation ? (
              <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Explanation
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                  {row.explanation}
                </p>
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}