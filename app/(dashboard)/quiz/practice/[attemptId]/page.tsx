import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { QuizRunner, type QuizRunnerQuestion } from "./quiz-runner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { isAnswerLetter } from "@/lib/quiz";
import { createClient } from "@/lib/supabase/server";

// Reads the auth session and RLS-scoped data; render per request.
export const dynamic = "force-dynamic";

type ActiveQuestion = {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
};

export default async function PracticeQuizPage({
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

  // A finished attempt can only be reviewed, never re-answered.
  if (attempt.completed_at) redirect(`/quiz/attempts/${attempt.id}`);

  const [{ data: course }, { data: answers, error: answersError }] =
    await Promise.all([
      supabase
        .from("courses")
        .select("id, code, name")
        .eq("id", attempt.course_id)
        .maybeSingle(),
      supabase
        .from("quiz_answers")
        .select("id, position, selected_answer, question_id")
        .eq("attempt_id", attempt.id)
        .order("position", { ascending: true }),
    ]);

  const answerRows = answers ?? [];

  // The correct answer and the explanation are deliberately NOT selected here:
  // an active quiz never receives them.
  let questionsFailed = false;
  const questionsById = new Map<string, ActiveQuestion>();
  if (answerRows.length > 0) {
    const { data: questionRows, error: questionsError } = await supabase
      .from("questions")
      .select("id, question, option_a, option_b, option_c, option_d")
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

  const items: QuizRunnerQuestion[] = [];
  for (const answer of answerRows) {
    const question = questionsById.get(answer.question_id);
    // A question deleted from the bank mid-attempt simply drops out.
    if (!question) continue;
    items.push({
      questionId: question.id,
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
    });
  }

  const heading = course ? `${course.code} — Practice Quiz` : "Practice Quiz";

  if (answersError || questionsFailed) {
    return (
      <>
        <PageHeader title={heading} />
        <ErrorState
          title="Could not load this practice quiz"
          message="An error occurred while loading the questions of this attempt. Please try again."
        />
      </>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <PageHeader title={heading} />
        <EmptyState
          title="This attempt has no questions"
          description="Its questions are no longer in your question bank. Start a new practice quiz instead."
          action={
            <Link
              href="/quiz/practice"
              className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-700"
            >
              Start a new practice quiz
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={heading}
        description="Answer every question, review your answers, then submit. The score is calculated after you submit."
      />
      <QuizRunner attemptId={attempt.id} items={items} />
    </>
  );
}