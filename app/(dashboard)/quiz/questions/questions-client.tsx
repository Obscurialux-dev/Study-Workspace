"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  QuestionForm,
  type QuestionFormValues,
  type QuestionMaterialOption,
  type QuestionTopicOption,
} from "./question-form";
import { createQuestion, deleteQuestion, updateQuestion } from "../actions";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { ANSWER_LETTERS, optionText } from "@/lib/quiz";
import type { FilterCourse } from "@/components/shared/search-filter-bar";
import type { Question } from "@/types/database";

export type QuestionRow = Question & {
  courseCode: string;
  topicTitle: string | null;
  materialTitle: string | null;
};

const primaryButton =
  "inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-700";
const outlineButton =
  "inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50";
const textButton =
  "rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100";
const dangerTextButton =
  "rounded-md px-2.5 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50";

function questionFormData(values: QuestionFormValues) {
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => formData.append(key, value));
  return formData;
}

/**
 * Question bank: create, edit, delete and filter the user's own
 * multiple-choice questions. Used by the /quiz/questions page.
 */
export function QuestionBank({
  questions,
  courses,
  topics,
  materials,
  filtered,
}: {
  questions: QuestionRow[];
  courses: FilterCourse[];
  topics: QuestionTopicOption[];
  materials: QuestionMaterialOption[];
  filtered: boolean;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState<"create" | Question | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const editing = formOpen && formOpen !== "create" ? formOpen : null;
  const createOpen = formOpen === "create";

  async function submitCreate(values: QuestionFormValues) {
    const { error } = await createQuestion(questionFormData(values));
    if (!error) {
      setFormOpen(null);
      router.refresh();
    }
    return error ?? null;
  }

  async function submitEdit(values: QuestionFormValues) {
    if (!editing) return "Question not found.";
    const { error } = await updateQuestion(
      editing.id,
      questionFormData(values)
    );
    if (!error) {
      setFormOpen(null);
      router.refresh();
    }
    return error ?? null;
  }

  async function submitDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      const { error } = await deleteQuestion(deleteTarget.id);
      if (error) {
        setDeleteError(error);
        return;
      }
      setDeleteTarget(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  const createButton = (
    <button
      type="button"
      onClick={() => setFormOpen("create")}
      className={primaryButton}
    >
      New question
    </button>
  );

  const modals = (
    <>
      {createOpen ? (
        <Modal title="New question" onClose={() => setFormOpen(null)}>
          <QuestionForm
            courses={courses}
            topics={topics}
            materials={materials}
            submitLabel="Create question"
            onSubmit={submitCreate}
            onCancel={() => setFormOpen(null)}
          />
        </Modal>
      ) : null}

      {editing ? (
        <Modal title="Edit question" onClose={() => setFormOpen(null)}>
          <QuestionForm
            key={editing.id}
            courses={courses}
            topics={topics}
            materials={materials}
            initial={editing}
            submitLabel="Save changes"
            onSubmit={submitEdit}
            onCancel={() => setFormOpen(null)}
          />
        </Modal>
      ) : null}

      {deleteTarget ? (
        <Modal title="Delete question" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-slate-600">
            Delete this question? This cannot be undone, and the question also
            disappears from past attempt reviews.
          </p>
          <p className="mt-2 text-sm font-medium text-slate-900">
            {deleteTarget.question}
          </p>
          {deleteError ? (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {deleteError}
            </p>
          ) : null}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className={outlineButton}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submitDelete()}
              disabled={deleting}
              className="inline-flex h-10 items-center justify-center rounded-md bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </Modal>
      ) : null}
    </>
  );

  if (questions.length === 0) {
    return (
      <>
        <EmptyState
          title={filtered ? "No questions match" : "No questions yet"}
          description={
            filtered
              ? "Try a different search term or course filter."
              : "Write a question manually, fill in options A to D, and mark the correct answer. A question can optionally be linked to an exam topic or a material."
          }
          action={filtered ? undefined : createButton}
        />
        {modals}
      </>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500">
          {questions.length} question{questions.length === 1 ? "" : "s"} shown
        </p>
        {createButton}
      </div>
      <ul className="space-y-3">
        {questions.map((question) => (
          <QuestionCard
            key={question.id}
            question={question}
            onEdit={() => setFormOpen(question)}
            onDelete={() => {
              setDeleteError(null);
              setDeleteTarget(question);
            }}
          />
        ))}
      </ul>
      {modals}
    </>
  );
}

function QuestionCard({
  question,
  onEdit,
  onDelete,
}: {
  question: QuestionRow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600">
              {question.courseCode}
            </span>
            {question.topicTitle ? (
              <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600">
                {question.topicTitle}
              </span>
            ) : null}
            {question.materialTitle ? (
              <span className="text-slate-500">{question.materialTitle}</span>
            ) : null}
          </div>
          <h3 className="mt-1 text-sm font-semibold text-slate-900">
            {question.question}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={onEdit} className={textButton}>
            Edit
          </button>
          <button type="button" onClick={onDelete} className={dangerTextButton}>
            Delete
          </button>
        </div>
      </div>

      <ul className="mt-3 space-y-1 text-sm">
        {ANSWER_LETTERS.map((letter) => {
          const correct = question.correct_answer === letter;
          return (
            <li
              key={letter}
              className={`flex items-start gap-2 rounded-md px-2 py-1 ${
                correct
                  ? "bg-emerald-50 font-medium text-emerald-800"
                  : "text-slate-600"
              }`}
            >
              <span className="w-4 shrink-0 text-xs font-semibold">
                {letter}
              </span>
              <span className="min-w-0">{optionText(question, letter)}</span>
              {correct ? (
                <span className="ml-auto shrink-0 text-xs font-medium">
                  Correct
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>

      {question.explanation ? (
        <p className="mt-2 whitespace-pre-line text-xs text-slate-500">
          {question.explanation}
        </p>
      ) : null}
    </li>
  );
}