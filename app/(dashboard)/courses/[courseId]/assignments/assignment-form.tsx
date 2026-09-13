"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";
import type { TutonSession } from "@/types/database";

const inputClasses =
  "mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

export const ASSIGNMENT_STATUS_OPTIONS = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

export type AssignmentFormValues = {
  title: string;
  description: string;
  session_id: string;
  deadline: string;
  status: string;
  external_url: string;
  file: File | null;
  removeFile: boolean;
};

export function assignmentFilename(filePath: string) {
  const segments = filePath.split("/");
  return segments[segments.length - 1] || filePath;
}

type SessionOption = Pick<TutonSession, "id" | "session_number" | "title">;

/** Create/edit form for an assignment, including optional file attachment. */
export function AssignmentForm({
  courseId,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  courseId: string;
  initial?: AssignmentFormValues & { file_path: string | null };
  submitLabel: string;
  onSubmit: (values: AssignmentFormValues) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<AssignmentFormValues>(
    initial
      ? {
          title: initial.title,
          description: initial.description,
          session_id: initial.session_id,
          deadline: initial.deadline,
          status: initial.status,
          external_url: initial.external_url,
          file: null,
          removeFile: false,
        }
      : {
          title: "",
          description: "",
          session_id: "",
          deadline: "",
          status: "not_started",
          external_url: "",
          file: null,
          removeFile: false,
        }
  );
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const existingFilePath = initial?.file_path ?? null;

  // Load the course's Tuton sessions for the optional session select.
  useEffect(() => {
    let active = true;
    createClient()
      .from("tuton_sessions")
      .select("id, session_number, title")
      .eq("course_id", courseId)
      .order("session_number", { ascending: true })
      .then(({ data }) => {
        if (active) setSessions(data ?? []);
      });
    return () => {
      active = false;
    };
  }, [courseId]);

  function set(
    key: keyof AssignmentFormValues,
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
      <AssignmentFormFields
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

function AssignmentFormFields({
  values,
  set,
  sessions,
  handleFile,
  existingFilePath,
}: {
  values: AssignmentFormValues;
  set: (
    key: keyof AssignmentFormValues,
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
          htmlFor="assignment-title"
          className="block text-sm font-medium text-slate-700"
        >
          Title <span className="text-red-600">*</span>
        </label>
        <input
          id="assignment-title"
          type="text"
          required
          value={values.title}
          onChange={(event) => set("title", event.target.value)}
          placeholder="e.g. Tugas 1 — Statistika Deskriptif"
          className={inputClasses}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="assignment-deadline"
            className="block text-sm font-medium text-slate-700"
          >
            Deadline <span className="text-red-600">*</span>
          </label>
          <input
            id="assignment-deadline"
            type="date"
            required
            value={values.deadline}
            onChange={(event) => set("deadline", event.target.value)}
            className={inputClasses}
          />
        </div>
        <div>
          <label
            htmlFor="assignment-status"
            className="block text-sm font-medium text-slate-700"
          >
            Status
          </label>
          <select
            id="assignment-status"
            value={values.status}
            onChange={(event) => set("status", event.target.value)}
            className={inputClasses}
          >
            {ASSIGNMENT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="assignment-session"
            className="block text-sm font-medium text-slate-700"
          >
            Tuton session
          </label>
          <select
            id="assignment-session"
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
            htmlFor="assignment-url"
            className="block text-sm font-medium text-slate-700"
          >
            External link
          </label>
          <input
            id="assignment-url"
            type="url"
            value={values.external_url}
            onChange={(event) => set("external_url", event.target.value)}
            placeholder="https://..."
            className={inputClasses}
          />
        </div>
      </div>
      <div>
        <label
          htmlFor="assignment-description"
          className="block text-sm font-medium text-slate-700"
        >
          Description / notes
        </label>
        <textarea
          id="assignment-description"
          rows={4}
          value={values.description}
          onChange={(event) => set("description", event.target.value)}
          placeholder="What must be done, instructions, progress notes..."
          className={inputClasses}
        />
      </div>
      <AssignmentFileField
        values={values}
        set={set}
        handleFile={handleFile}
        existingFilePath={existingFilePath}
      />
    </>
  );
}

function AssignmentFileField({
  values,
  set,
  handleFile,
  existingFilePath,
}: {
  values: AssignmentFormValues;
  set: (
    key: keyof AssignmentFormValues,
    value: string | File | null | boolean
  ) => void;
  handleFile: (event: ChangeEvent<HTMLInputElement>) => void;
  existingFilePath: string | null;
}) {
  return (
    <div>
      <label
        htmlFor="assignment-file"
        className="block text-sm font-medium text-slate-700"
      >
        File attachment (PDF, DOCX, TXT)
      </label>
      {existingFilePath && !values.removeFile && !values.file ? (
        <div className="mt-1 flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <span className="truncate text-slate-700">
            {assignmentFilename(existingFilePath)}
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
          id="assignment-file"
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleFile}
          className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-slate-700"
        />
      )}
      {values.file ? (
        <p className="mt-1 text-xs text-slate-500">Selected: {values.file.name}</p>
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
