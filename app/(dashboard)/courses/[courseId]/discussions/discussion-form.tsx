"use client";

import { useEffect, useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";
import type { TutonSession } from "@/types/database";

type SessionOption = Pick<TutonSession, "id" | "session_number" | "title">;

const inputClasses =
  "mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

export const DISCUSSION_STATUS_OPTIONS = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

export type DiscussionFormValues = {
  title: string;
  session_id: string;
  deadline: string;
  external_url: string;
  response_text: string;
  status: string;
};

/** Create/edit form for a tracked Tuton discussion. */
export function DiscussionForm({
  courseId,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  courseId: string;
  initial?: DiscussionFormValues;
  submitLabel: string;
  onSubmit: (values: DiscussionFormValues) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<DiscussionFormValues>(
    initial ?? {
      title: "",
      session_id: "",
      deadline: "",
      external_url: "",
      response_text: "",
      status: "not_started",
    }
  );
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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

  function set(key: keyof DiscussionFormValues, value: string) {
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
      <div>
        <label
          htmlFor="discussion-title"
          className="block text-sm font-medium text-slate-700"
        >
          Title <span className="text-red-600">*</span>
        </label>
        <input
          id="discussion-title"
          type="text"
          required
          value={values.title}
          onChange={(event) => set("title", event.target.value)}
          placeholder="e.g. Diskusi 1 — Perkenalan"
          className={inputClasses}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="discussion-deadline"
            className="block text-sm font-medium text-slate-700"
          >
            Deadline <span className="text-red-600">*</span>
          </label>
          <input
            id="discussion-deadline"
            type="date"
            required
            value={values.deadline}
            onChange={(event) => set("deadline", event.target.value)}
            className={inputClasses}
          />
        </div>
        <div>
          <label
            htmlFor="discussion-status"
            className="block text-sm font-medium text-slate-700"
          >
            Status
          </label>
          <select
            id="discussion-status"
            value={values.status}
            onChange={(event) => set("status", event.target.value)}
            className={inputClasses}
          >
            {DISCUSSION_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="discussion-session"
            className="block text-sm font-medium text-slate-700"
          >
            Tuton session
          </label>
          <select
            id="discussion-session"
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
            htmlFor="discussion-url"
            className="block text-sm font-medium text-slate-700"
          >
            Tuton link
          </label>
          <input
            id="discussion-url"
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
          htmlFor="discussion-response"
          className="block text-sm font-medium text-slate-700"
        >
          Draft / response
        </label>
        <textarea
          id="discussion-response"
          rows={6}
          value={values.response_text}
          onChange={(event) => set("response_text", event.target.value)}
          placeholder="Draft your response here before posting it on the Tuton website..."
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
