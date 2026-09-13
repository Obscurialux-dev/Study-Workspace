"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";
import type { FilterCourse } from "@/components/shared/search-filter-bar";
import type { TutonSession } from "@/types/database";

const inputClasses =
  "mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

export type MaterialFormValues = {
  course_id: string;
  title: string;
  module_name: string;
  topic: string;
  session_id: string;
  source: string;
  content: string;
  file: File | null;
  removeFile: boolean;
};

export function materialFilename(filePath: string) {
  const segments = filePath.split("/");
  return segments[segments.length - 1] || filePath;
}

type SessionOption = Pick<TutonSession, "id" | "session_number" | "title">;

/**
 * Create/edit form for a material. When `fixedCourseId` is set the course
 * is fixed (course pages and edit flows); otherwise a course must be
 * selected from `courses`. The session select is loaded per course.
 */
export function MaterialForm({
  courses,
  fixedCourseId,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  courses?: FilterCourse[];
  fixedCourseId?: string;
  initial?: MaterialFormValues & { file_path: string | null };
  submitLabel: string;
  onSubmit: (values: MaterialFormValues) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<MaterialFormValues>(
    initial
      ? {
          course_id: initial.course_id,
          title: initial.title,
          module_name: initial.module_name,
          topic: initial.topic,
          session_id: initial.session_id,
          source: initial.source,
          content: initial.content,
          file: null,
          removeFile: false,
        }
      : {
          course_id: fixedCourseId ?? "",
          title: "",
          module_name: "",
          topic: "",
          session_id: "",
          source: "",
          content: "",
          file: null,
          removeFile: false,
        }
  );
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const existingFilePath = initial?.file_path ?? null;

  const effectiveCourseId = fixedCourseId ?? values.course_id;

  // Load the course's Tuton sessions for the optional session select.
  useEffect(() => {
    let active = true;
    if (!effectiveCourseId) return;
    createClient()
      .from("tuton_sessions")
      .select("id, session_number, title")
      .eq("course_id", effectiveCourseId)
      .order("session_number", { ascending: true })
      .then(({ data }) => {
        if (active) setSessions(data ?? []);
      });
    return () => {
      active = false;
    };
  }, [effectiveCourseId]);

  function set(
    key: keyof MaterialFormValues,
    value: string | File | null | boolean
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    set("file", event.target.files?.[0] ?? null);
    set("removeFile", false);
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
      {!fixedCourseId ? (
        <div>
          <label
            htmlFor="material-course"
            className="block text-sm font-medium text-slate-700"
          >
            Course <span className="text-red-600">*</span>
          </label>
          <select
            id="material-course"
            required
            value={values.course_id}
            onChange={(event) => {
              set("course_id", event.target.value);
              set("session_id", "");
              setSessions([]);
            }}
            className={inputClasses}
          >
            <option value="">Select a course...</option>
            {(courses ?? []).map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} — {course.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <FormFields
        values={values}
        set={set}
        sessions={sessions}
        handleFile={handleFile}
        existingFilePath={existingFilePath}
      />
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <FormActions onCancel={onCancel} pending={pending} label={submitLabel} />
    </form>
  );
}

function FormFields({
  values,
  set,
  sessions,
  handleFile,
  existingFilePath,
}: {
  values: MaterialFormValues;
  set: (
    key: keyof MaterialFormValues,
    value: string | File | null | boolean
  ) => void;
  sessions: SessionOption[];
  handleFile: (event: ChangeEvent<HTMLInputElement>) => void;
  existingFilePath: string | null;
}) {
  return (
    <>
      <div>
        <label
          htmlFor="material-title"
          className="block text-sm font-medium text-slate-700"
        >
          Title <span className="text-red-600">*</span>
        </label>
        <input
          id="material-title"
          type="text"
          required
          value={values.title}
          onChange={(event) => set("title", event.target.value)}
          placeholder="e.g. Modul 1 — Statistika Dasar"
          className={inputClasses}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="material-module"
            className="block text-sm font-medium text-slate-700"
          >
            Module
          </label>
          <input
            id="material-module"
            type="text"
            value={values.module_name}
            onChange={(event) => set("module_name", event.target.value)}
            placeholder="e.g. Modul 1"
            className={inputClasses}
          />
        </div>
        <div>
          <label
            htmlFor="material-topic"
            className="block text-sm font-medium text-slate-700"
          >
            Topic
          </label>
          <input
            id="material-topic"
            type="text"
            value={values.topic}
            onChange={(event) => set("topic", event.target.value)}
            placeholder="e.g. Data dan variabel"
            className={inputClasses}
          />
        </div>
        <div>
          <label
            htmlFor="material-session"
            className="block text-sm font-medium text-slate-700"
          >
            Tuton session
          </label>
          <select
            id="material-session"
            value={values.session_id}
            onChange={(event) => set("session_id", event.target.value)}
            className={inputClasses}
            disabled={sessions.length === 0}
          >
            <option value="">No session</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                Session {session.session_number} — {session.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="material-source"
            className="block text-sm font-medium text-slate-700"
          >
            Source
          </label>
          <input
            id="material-source"
            type="text"
            value={values.source}
            onChange={(event) => set("source", event.target.value)}
            placeholder="e.g. Universitas Terbuka"
            className={inputClasses}
          />
        </div>
      </div>
      <div>
        <label
          htmlFor="material-content"
          className="block text-sm font-medium text-slate-700"
        >
          Content
        </label>
        <textarea
          id="material-content"
          rows={5}
          value={values.content}
          onChange={(event) => set("content", event.target.value)}
          placeholder="Paste or write the material content..."
          className={inputClasses}
        />
      </div>
      <div>
        <label
          htmlFor="material-file"
          className="block text-sm font-medium text-slate-700"
        >
          File (PDF, DOCX, TXT)
        </label>
        {existingFilePath && !values.removeFile && !values.file ? (
          <div className="mt-1 flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <span className="truncate text-slate-700">
              {materialFilename(existingFilePath)}
            </span>
            <button
              type="button"
              onClick={() => set("removeFile", true)}
              className="shrink-0 text-sm font-medium text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <input
            id="material-file"
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFile}
            className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700"
          />
        )}
        {values.file ? (
          <p className="mt-1 text-xs text-slate-500">
            Selected: {values.file.name}
          </p>
        ) : null}
        {values.removeFile ? (
          <p className="mt-1 text-xs text-red-600">
            File will be removed when saved.{" "}
            <button
              type="button"
              onClick={() => set("removeFile", false)}
              className="font-medium underline"
            >
              Undo
            </button>
          </p>
        ) : null}
      </div>
    </>
  );
}

function FormActions({
  onCancel,
  pending,
  label,
}: {
  onCancel: () => void;
  pending: boolean;
  label: string;
}) {
  return (
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
        {pending ? "Saving..." : label}
      </button>
    </div>
  );
}
