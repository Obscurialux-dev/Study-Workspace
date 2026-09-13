"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { initializeTuton, updateTutonSession } from "./actions";
import {
  TutonSessionForm,
  type TutonSessionFormValues,
} from "./tuton-session-form";
import { EmptyState } from "@/components/ui/empty-state";
import {
  StatusBadge,
  formatAcademicDate,
  isPastDeadline,
} from "@/components/shared/tuton-status";
import type { TutonSession } from "@/types/database";

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 shadow-lg"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function toFormValues(session: TutonSession): TutonSessionFormValues {
  return {
    title: session.title,
    start_date: session.start_date,
    end_date: session.end_date,
    material_label: session.material_label ?? "",
    activity_label: session.activity_label ?? "",
    activity_type: session.activity_type,
    status: session.status,
    notes: session.notes ?? "",
  };
}

/**
 * Tuton session list for one course: empty state with "Initialize Tuton",
 * session timeline, and per-session editing.
 */
export function TutonClient({
  courseId,
  sessions,
}: {
  courseId: string;
  sessions: TutonSession[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<TutonSession | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleInitialize() {
    setActionError(null);
    setInitializing(true);
    try {
      const { error } = await initializeTuton(courseId);
      if (error) {
        setActionError(error);
        return;
      }
      router.refresh();
    } finally {
      setInitializing(false);
    }
  }

  if (sessions.length === 0) {
    return (
      <div>
        <EmptyState
          title="Tuton is not initialized yet"
          description="Initialize Tuton to create the 8 supplied sessions of the 2026/2027 schedule with their exact dates."
          action={
            <button
              type="button"
              onClick={handleInitialize}
              disabled={initializing}
              className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
            >
              {initializing ? "Initializing..." : "Initialize Tuton"}
            </button>
          }
        />
        {actionError ? (
          <p role="alert" className="mt-3 text-center text-sm text-red-600">
            {actionError}
          </p>
        ) : null}
      </div>
    );
  }

  async function submitEdit(values: TutonSessionFormValues) {
    if (!editing) return "Session not found.";
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) =>
      formData.append(key, value)
    );
    const { error } = await updateTutonSession(editing.id, formData);
    if (!error) {
      setEditing(null);
      router.refresh();
    }
    return error ?? null;
  }

  return (
    <>
      <ul className="space-y-3">
        {sessions.map((session) => (
          <li
            key={session.id}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white"
                  aria-hidden="true"
                >
                  {session.session_number}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {session.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatAcademicDate(session.start_date)} &ndash;{" "}
                    {formatAcademicDate(session.end_date)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isPastDeadline(session.end_date, session.status) ? (
                  <span className="text-xs font-medium text-red-600">
                    Past deadline
                  </span>
                ) : null}
                <StatusBadge status={session.status} />
                <button
                  type="button"
                  onClick={() => setEditing(session)}
                  className="rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Edit
                </button>
              </div>
            </div>
            {session.material_label || session.activity_label ? (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {session.material_label ? (
                  <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600">
                    {session.material_label}
                  </span>
                ) : null}
                {session.activity_label ? (
                  <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600">
                    {session.activity_label} ({session.activity_type})
                  </span>
                ) : null}
              </div>
            ) : null}
            {session.notes ? (
              <p className="mt-2 whitespace-pre-line text-sm text-slate-600">
                {session.notes}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      {editing ? (
        <Modal
          title={`Session ${editing.session_number}: ${editing.title}`}
          onClose={() => setEditing(null)}
        >
          <TutonSessionForm
            key={editing.id}
            initial={toFormValues(editing)}
            submitLabel="Save changes"
            onSubmit={submitEdit}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      ) : null}
    </>
  );
}
