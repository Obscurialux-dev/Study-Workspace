"use client";

import { useState, type FormEvent } from "react";

const inputClasses =
  "mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

export type CourseFormValues = {
  code: string;
  name: string;
  description: string;
  semester: string;
  color: string;
  icon: string;
};

export const EMPTY_COURSE_FORM: CourseFormValues = {
  code: "",
  name: "",
  description: "",
  semester: "",
  color: "",
  icon: "",
};

/**
 * Shared course form used by both the create and edit flows.
 * `submit` performs the mutation (server action) and returns an error
 * message or null on success.
 */
export function CourseForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: CourseFormValues;
  submitLabel: string;
  onSubmit: (values: CourseFormValues) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<CourseFormValues>(
    initial ?? EMPTY_COURSE_FORM
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function set(key: keyof CourseFormValues, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const submitError = await onSubmit(values);
      if (submitError) setError(submitError);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="course-code"
            className="block text-sm font-medium text-slate-700"
          >
            Course code <span className="text-red-600">*</span>
          </label>
          <input
            id="course-code"
            type="text"
            required
            value={values.code}
            onChange={(event) => set("code", event.target.value)}
            placeholder="e.g. SADA1234"
            className={inputClasses}
          />
        </div>
        <div>
          <label
            htmlFor="course-name"
            className="block text-sm font-medium text-slate-700"
          >
            Course name <span className="text-red-600">*</span>
          </label>
          <input
            id="course-name"
            type="text"
            required
            value={values.name}
            onChange={(event) => set("name", event.target.value)}
            placeholder="e.g. Statistika Dasar"
            className={inputClasses}
          />
        </div>
        <div>
          <label
            htmlFor="course-semester"
            className="block text-sm font-medium text-slate-700"
          >
            Semester
          </label>
          <input
            id="course-semester"
            type="text"
            value={values.semester}
            onChange={(event) => set("semester", event.target.value)}
            placeholder="e.g. 2026/2027.1"
            className={inputClasses}
          />
        </div>
        <div>
          <label
            htmlFor="course-color"
            className="block text-sm font-medium text-slate-700"
          >
            Color
          </label>
          <input
            id="course-color"
            type="color"
            value={values.color || "#6366f1"}
            onChange={(event) => set("color", event.target.value)}
            className="mt-1 block h-9 w-full cursor-pointer rounded-md border border-slate-300 px-1 py-1 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
      </div>
      <div>
        <label
          htmlFor="course-description"
          className="block text-sm font-medium text-slate-700"
        >
          Description
        </label>
        <textarea
          id="course-description"
          rows={3}
          value={values.description}
          onChange={(event) => set("description", event.target.value)}
          placeholder="Short description of the course"
          className={inputClasses}
        />
      </div>
      <div>
        <label
          htmlFor="course-icon"
          className="block text-sm font-medium text-slate-700"
        >
          Icon
        </label>
        <input
          id="course-icon"
          type="text"
          value={values.icon}
          onChange={(event) => set("icon", event.target.value)}
          placeholder="e.g. book, chart, calculator"
          className={inputClasses}
        />
      </div>
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
