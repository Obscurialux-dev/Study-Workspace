"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { startPracticeQuiz } from "../actions";
import type {
  QuestionMaterialOption,
  QuestionTopicOption,
} from "../questions/question-form";
import { DEFAULT_QUESTION_COUNT, MAX_QUESTION_COUNT } from "@/lib/quiz";
import type { FilterCourse } from "@/components/shared/search-filter-bar";
import type { Question } from "@/types/database";

/** Minimal question metadata used to count what a setup would select. */
export type PracticeQuestionIndex = Pick<
  Question,
  "id" | "course_id" | "exam_topic_id" | "material_id"
>;

const selectClasses =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
const inputClasses =
  "mt-1 block w-32 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

/**
 * Practice setup: course (required) + question count, with optional exam topic
 * and material narrowing. The matching question count is shown before starting
 * so a smaller-than-requested quiz is never a surprise.
 */
export function PracticeForm({
  courses,
  topics,
  materials,
  questionIndex,
  initialCourseId = "",
}: {
  courses: FilterCourse[];
  topics: QuestionTopicOption[];
  materials: QuestionMaterialOption[];
  questionIndex: PracticeQuestionIndex[];
  initialCourseId?: string;
}) {
  const router = useRouter();
  const [courseId, setCourseId] = useState(initialCourseId);
  const [examTopicId, setExamTopicId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [questionCount, setQuestionCount] = useState(
    String(DEFAULT_QUESTION_COUNT)
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const courseTopics = topics.filter((topic) => topic.course_id === courseId);
  const courseMaterials = materials.filter(
    (material) => material.course_id === courseId
  );

  const requested = questionCount.trim() === "" ? NaN : Number(questionCount);
  const countValid =
    Number.isInteger(requested) &&
    requested >= 1 &&
    requested <= MAX_QUESTION_COUNT;

  const availableCount = courseId
    ? questionIndex.filter(
        (question) =>
          question.course_id === courseId &&
          (!examTopicId || question.exam_topic_id === examTopicId) &&
          (!materialId || question.material_id === materialId)
      ).length
    : 0;

  /** Changing the course invalidates any topic/material of the old course. */
  function changeCourse(value: string) {
    setCourseId(value);
    setExamTopicId("");
    setMaterialId("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData();
    formData.append("course_id", courseId);
    formData.append("exam_topic_id", examTopicId);
    formData.append("material_id", materialId);
    formData.append("question_count", questionCount);

    const result = await startPracticeQuiz(formData);
    if (result.error || !result.attemptId) {
      setPending(false);
      setError(result.error ?? "Could not start the practice quiz.");
      return;
    }
    router.push(`/quiz/practice/${result.attemptId}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div>
        <label
          htmlFor="practice-course"
          className="block text-sm font-medium text-slate-700"
        >
          Course
        </label>
        <select
          id="practice-course"
          required
          value={courseId}
          onChange={(event) => changeCourse(event.target.value)}
          className={selectClasses}
        >
          <option value="">Select a course</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.code} — {course.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="practice-count"
          className="block text-sm font-medium text-slate-700"
        >
          Number of questions
        </label>
        <input
          id="practice-count"
          type="number"
          min={1}
          max={MAX_QUESTION_COUNT}
          step={1}
          required
          value={questionCount}
          onChange={(event) => setQuestionCount(event.target.value)}
          className={inputClasses}
        />
        <p className="mt-1 text-xs text-slate-500">
          Between 1 and {MAX_QUESTION_COUNT}. Questions are picked in random
          order; there is no timer.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="practice-topic"
            className="block text-sm font-medium text-slate-700"
          >
            Exam topic (optional)
          </label>
          <select
            id="practice-topic"
            value={examTopicId}
            onChange={(event) => setExamTopicId(event.target.value)}
            disabled={!courseId}
            className={selectClasses}
          >
            <option value="">All topics</option>
            {courseTopics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="practice-material"
            className="block text-sm font-medium text-slate-700"
          >
            Material (optional)
          </label>
          <select
            id="practice-material"
            value={materialId}
            onChange={(event) => setMaterialId(event.target.value)}
            disabled={!courseId}
            className={selectClasses}
          >
            <option value="">All materials</option>
            {courseMaterials.map((material) => (
              <option key={material.id} value={material.id}>
                {material.module_name ? `${material.module_name} — ` : ""}
                {material.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {courseId ? (
        <div
          className={`text-sm ${
            availableCount === 0 ? "text-amber-700" : "text-slate-600"
          }`}
        >
          {availableCount === 0
            ? "No questions match this selection yet. Add questions in the Question Bank first."
            : `${availableCount} question${
                availableCount === 1 ? "" : "s"
              } available for this selection.`}
          {availableCount > 0 && countValid && requested > availableCount ? (
            <span className="mt-1 block text-amber-700">
              You asked for {requested}, so this quiz will use all{" "}
              {availableCount} available question
              {availableCount === 1 ? "" : "s"}.
            </span>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Select a course to see how many questions are available.
        </p>
      )}

      {!countValid ? (
        <p role="alert" className="text-sm text-red-600">
          Enter a whole number between 1 and {MAX_QUESTION_COUNT}.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending || !courseId || availableCount === 0 || !countValid}
          className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
        >
          {pending ? "Starting..." : "Start practice quiz"}
        </button>
      </div>
    </form>
  );
}