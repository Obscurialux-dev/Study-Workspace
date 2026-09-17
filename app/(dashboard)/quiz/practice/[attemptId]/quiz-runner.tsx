"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { saveQuizAnswer, submitQuizAttempt } from "../../actions";
import { Modal } from "@/components/ui/modal";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ANSWER_LETTERS, optionText, type AnswerLetter } from "@/lib/quiz";
import type { QuestionOptions } from "@/lib/quiz";

export type QuizRunnerQuestion = {
  questionId: string;
  text: string;
  options: QuestionOptions;
  selectedAnswer: AnswerLetter | null;
};

const primaryButton =
  "inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50";
const outlineButton =
  "inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50";

function initialAnswers(
  items: QuizRunnerQuestion[]
): Record<string, AnswerLetter | null> {
  const map: Record<string, AnswerLetter | null> = {};
  for (const item of items) {
    map[item.questionId] = item.selectedAnswer;
  }
  return map;
}

/**
 * Active practice quiz: next/previous navigation, a question navigator, answer
 * review before submitting, and per-answer persistence through server actions.
 * Complete correctness is only revealed after submitting (the result page).
 */
export function QuizRunner({
  attemptId,
  items,
}: {
  attemptId: string;
  items: QuizRunnerQuestion[];
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, AnswerLetter | null>>(
    () => initialAnswers(items)
  );
  const [index, setIndex] = useState(0);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const current = items[index];
  const currentAnswer = current ? answers[current.questionId] ?? null : null;
  const answeredCount = items.filter((item) => answers[item.questionId]).length;
  const unansweredCount = items.length - answeredCount;

  async function selectAnswer(letter: AnswerLetter) {
    if (!current || savingId) return;
    const previous = answers[current.questionId] ?? null;
    if (previous === letter) return;

    setError(null);
    setSavingId(current.questionId);
    setAnswers((prev) => ({ ...prev, [current.questionId]: letter }));

    const { error: saveError } = await saveQuizAnswer(
      attemptId,
      current.questionId,
      letter
    );
    setSavingId(null);

    if (saveError) {
      // Revert so the screen always matches what is stored on the server.
      setAnswers((prev) => ({ ...prev, [current.questionId]: previous }));
      setError(saveError);
    }
  }

  async function submit() {
    setSubmitError(null);
    setSubmitting(true);
    const { error: submitFailure } = await submitQuizAttempt(attemptId);
    if (submitFailure) {
      setSubmitting(false);
      setSubmitOpen(false);
      setSubmitError(submitFailure);
      return;
    }
    router.push(`/quiz/attempts/${attemptId}`);
  }

  function goToFirstUnanswered() {
    const next = items.findIndex((item) => !answers[item.questionId]);
    if (next >= 0) setIndex(next);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Question {index + 1} of {items.length}
          </h2>
          <p className="text-sm text-slate-500">
            {answeredCount} answered · {unansweredCount} not answered
          </p>
        </div>
        <ProgressBar
          value={(answeredCount / items.length) * 100}
          className="mt-3"
        />
        <p className="mt-2 text-xs text-slate-500">
          {savingId
            ? "Saving answer..."
            : "Answers are saved as you go. There is no timer, so you can leave and continue this attempt later."}
        </p>
      </section>

      {current ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-900">{current.text}</p>
          <fieldset className="mt-3 space-y-2">
            <legend className="sr-only">Answer options</legend>
            {ANSWER_LETTERS.map((letter) => {
              const selected = currentAnswer === letter;
              return (
                <label
                  key={letter}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors ${
                    selected
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${current.questionId}`}
                    value={letter}
                    checked={selected}
                    onChange={() => void selectAnswer(letter)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-slate-900"
                  />
                  <span className="min-w-0">
                    <span className="font-semibold text-slate-900">
                      {letter}.
                    </span>{" "}
                    <span className="text-slate-700">
                      {optionText(current.options, letter)}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          {error ? (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
              disabled={index === 0}
              className={outlineButton}
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() =>
                setIndex((prev) => Math.min(items.length - 1, prev + 1))
              }
              disabled={index >= items.length - 1}
              className={primaryButton}
            >
              Next
            </button>
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Review before submitting
          </h2>
          {unansweredCount > 0 ? (
            <button
              type="button"
              onClick={goToFirstUnanswered}
              className="rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              Go to first unanswered
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item, itemIndex) => {
            const answered = Boolean(answers[item.questionId]);
            const isCurrent = itemIndex === index;
            return (
              <button
                key={item.questionId}
                type="button"
                onClick={() => setIndex(itemIndex)}
                aria-label={`Go to question ${itemIndex + 1}`}
                aria-current={isCurrent ? "true" : undefined}
                className={`h-8 w-8 rounded-md text-sm font-medium transition-colors ${
                  isCurrent
                    ? "bg-slate-900 text-white"
                    : answered
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "border border-dashed border-slate-300 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {itemIndex + 1}
              </button>
            );
          })}
        </div>

        <ul className="mt-4 space-y-2">
          {items.map((item, itemIndex) => {
            const answer = answers[item.questionId] ?? null;
            return (
              <li
                key={item.questionId}
                className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-slate-200 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">
                    Question {itemIndex + 1}
                  </p>
                  <p className="truncate text-sm text-slate-700">{item.text}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      answer
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {answer ? `Answer: ${answer}` : "Not answered"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIndex(itemIndex)}
                    className="rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    Open
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        {submitError ? (
          <p role="alert" className="mb-3 text-sm text-red-600">
            {submitError}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/quiz/practice"
            className="text-sm font-medium text-slate-600 hover:underline"
          >
            Leave quiz
          </Link>
          <button
            type="button"
            onClick={() =>
              unansweredCount > 0 ? setSubmitOpen(true) : void submit()
            }
            disabled={submitting}
            className={primaryButton}
          >
            {submitting ? "Submitting..." : "Submit quiz"}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Unanswered questions count as incorrect. Your score is calculated on
          the server after you submit. Leaving now keeps this attempt in your
          history so you can continue it later.
        </p>
      </section>

      {submitOpen ? (
        <Modal title="Submit practice quiz" onClose={() => setSubmitOpen(false)}>
          <p className="text-sm text-slate-600">
            You have {unansweredCount} unanswered question
            {unansweredCount === 1 ? "" : "s"}. Unanswered questions count as
            incorrect. Submit anyway?
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSubmitOpen(false)}
              className={outlineButton}
            >
              Keep answering
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={submitting}
              className={primaryButton}
            >
              {submitting ? "Submitting..." : "Submit quiz"}
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}