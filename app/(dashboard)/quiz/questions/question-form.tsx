"use client";

import { useState, type FormEvent } from "react";

import { optionText } from "@/lib/quiz";
import type { FilterCourse } from "@/components/shared/search-filter-bar";
import type { Question } from "@/types/database";

const inputClasses =
  "mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
const selectClasses =
  "mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

export type QuestionTopicOption = {
  id: string;
  course_id: string;
  title: string;
};

export type QuestionMaterialOption = {
  id: string;
  course_id: string;
  title: string;
  module_name: string | null;
};

export type QuestionFormValues = {
  course_id: string;
  exam_topic_id: string;
  material_id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
};

const EMPTY_VALUES: QuestionFormValues = {
  course_id: "",
  exam_topic_id: "",
  material_id: "",
  question: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_answer: "",
  explanation: "",
};

type ValueUpdate = <K extends keyof QuestionFormValues>(
  key: K,
  value: QuestionFormValues[K]
) => void;

/**
 * Create/edit form for one multiple-choice question. Questions are authored
 * manually; the optional exam topic and material selects only offer records
 * that belong to the selected course.
 */
export function QuestionForm({
  courses,
  topics,
  materials,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  courses: FilterCourse[];
  topics: QuestionTopicOption[];
  materials: QuestionMaterialOption[];
  initial?: Question;
  submitLabel: string;
  onSubmit: (values: QuestionFormValues) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<QuestionFormValues>(
    initial
      ? {
          course_id: initial.course_id,
          exam_topic_id: initial.exam_topic_id ?? "",
          material_id: initial.material_id ?? "",
          question: initial.question,
          option_a: initial.option_a,
          option_b: initial.option_b,
          option_c: initial.option_c,
          option_d: initial.option_d,
          correct_answer: initial.correct_answer,
          explanation: initial.explanation ?? "",
        }
      : EMPTY_VALUES
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function update<K extends keyof QuestionFormValues>(
    key: K,
    value: QuestionFormValues[K]
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  /** Changing the course invalidates any topic/material of the old course. */
  function changeCourse(courseId: string) {
    setValues((current) => ({
      ...current,
      course_id: courseId,
      exam_topic_id: "",
      material_id: "",
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const message = await onSubmit(values);
    setPending(false);
    if (message) setError(message);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CourseFields
        courses={courses}
        topics={topics.filter((topic) => topic.course_id === values.course_id)}
        materials={materials.filter(
          (material) => material.course_id === values.course_id
        )}
        values={values}
        onChange={update}
        onCourseChange={changeCourse}
      />
      <QuestionFields values={values} onChange={update} />
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
        >
          {pending ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

function CourseFields({
  courses,
  topics,
  materials,
  values,
  onChange,
  onCourseChange,
}: {
  courses: FilterCourse[];
  topics: QuestionTopicOption[];
  materials: QuestionMaterialOption[];
  values: QuestionFormValues;
  onChange: ValueUpdate;
  onCourseChange: (courseId: string) => void;
}) {
  return (
    <>
      <div>
        <label
          htmlFor="question-course"
          className="block text-sm font-medium text-slate-700"
        >
          Course
        </label>
        <select
          id="question-course"
          required
          value={values.course_id}
          onChange={(event) => onCourseChange(event.target.value)}
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="question-topic"
            className="block text-sm font-medium text-slate-700"
          >
            Exam topic (optional)
          </label>
          <select
            id="question-topic"
            value={values.exam_topic_id}
            onChange={(event) => onChange("exam_topic_id", event.target.value)}
            disabled={!values.course_id}
            className={selectClasses}
          >
            <option value="">None</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="question-material"
            className="block text-sm font-medium text-slate-700"
          >
            Material (optional)
          </label>
          <select
            id="question-material"
            value={values.material_id}
            onChange={(event) => onChange("material_id", event.target.value)}
            disabled={!values.course_id}
            className={selectClasses}
          >
            <option value="">None</option>
            {materials.map((material) => (
              <option key={material.id} value={material.id}>
                {material.module_name ? `${material.module_name} — ` : ""}
                {material.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Exam topics and materials belong to the selected course. A material is a
        source reference only — nothing is read or parsed from its file.
      </p>
    </>
  );
}

const OPTION_FIELDS = [
  { key: "option_a", letter: "A" },
  { key: "option_b", letter: "B" },
  { key: "option_c", letter: "C" },
  { key: "option_d", letter: "D" },
] as const;

function QuestionFields({
  values,
  onChange,
}: {
  values: QuestionFormValues;
  onChange: ValueUpdate;
}) {
  const options = {
    option_a: values.option_a,
    option_b: values.option_b,
    option_c: values.option_c,
    option_d: values.option_d,
  };

  return (
    <>
      <div>
        <label
          htmlFor="question-text"
          className="block text-sm font-medium text-slate-700"
        >
          Question
        </label>
        <textarea
          id="question-text"
          required
          rows={3}
          value={values.question}
          onChange={(event) => onChange("question", event.target.value)}
          placeholder="Write the question..."
          className={inputClasses}
        />
      </div>

      {OPTION_FIELDS.map(({ key, letter }) => (
        <div key={key}>
          <label
            htmlFor={`question-${key}`}
            className="block text-sm font-medium text-slate-700"
          >
            Option {letter}
          </label>
          <input
            id={`question-${key}`}
            type="text"
            required
            value={values[key]}
            onChange={(event) => onChange(key, event.target.value)}
            className={inputClasses}
          />
        </div>
      ))}

      <div>
        <label
          htmlFor="question-correct"
          className="block text-sm font-medium text-slate-700"
        >
          Correct answer
        </label>
        <select
          id="question-correct"
          required
          value={values.correct_answer}
          onChange={(event) => onChange("correct_answer", event.target.value)}
          className={selectClasses}
        >
          <option value="">Select the correct answer</option>
          {OPTION_FIELDS.map(({ letter }) => {
            const text = optionText(options, letter);
            return (
              <option key={letter} value={letter}>
                {letter}
                {text
                  ? ` — ${text.length > 60 ? `${text.slice(0, 60)}…` : text}`
                  : ""}
              </option>
            );
          })}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          Only A, B, C or D can be the correct answer.
        </p>
      </div>

      <div>
        <label
          htmlFor="question-explanation"
          className="block text-sm font-medium text-slate-700"
        >
          Explanation (optional)
        </label>
        <textarea
          id="question-explanation"
          rows={2}
          value={values.explanation}
          onChange={(event) => onChange("explanation", event.target.value)}
          placeholder="Why is this the correct answer? Shown in the result review."
          className={inputClasses}
        />
      </div>
    </>
  );
}