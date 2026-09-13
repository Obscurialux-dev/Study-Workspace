"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  DiscussionForm,
  DISCUSSION_STATUS_OPTIONS,
  type DiscussionFormValues,
} from "./discussion-form";
import { createDiscussion, deleteDiscussion, updateDiscussion } from "./actions";
import {
  StatusBadge,
  formatAcademicDate,
  isPastDeadline,
} from "@/components/shared/tuton-status";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import type { Discussion, TutonSession } from "@/types/database";

export type DiscussionRow = Discussion & {
  tuton_sessions: Pick<TutonSession, "session_number"> | null;
};

function discussionFormData(values: DiscussionFormValues) {
  const formData = new FormData();
  formData.append("title", values.title);
  formData.append("session_id", values.session_id);
  formData.append("deadline", values.deadline);
  formData.append("external_url", values.external_url);
  formData.append("response_text", values.response_text);
  formData.append("status", values.status);
  return formData;
}

/** Discussions list for one course, with status filter and CRUD. */
export function DiscussionsClient({
  courseId,
  discussions,
  filterStatus = "",
}: {
  courseId: string;
  discussions: DiscussionRow[];
  filterStatus?: string;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState<"create" | Discussion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Discussion | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const editing = formOpen && formOpen !== "create" ? formOpen : null;
  const createOpen = formOpen === "create";

  async function submitCreate(values: DiscussionFormValues) {
    const { error } = await createDiscussion(courseId, discussionFormData(values));
    if (!error) setFormOpen(null);
    return error ?? null;
  }

  async function submitEdit(values: DiscussionFormValues) {
    if (!editing) return "Discussion not found.";
    const { error } = await updateDiscussion(
      editing.id,
      discussionFormData(values)
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
      const { error } = await deleteDiscussion(deleteTarget.id);
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
      className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-700"
    >
      New discussion
    </button>
  );

  return (
    <>
      <SearchFilterBar
        basePath={`/courses/${courseId}/discussions`}
        status={filterStatus}
        statuses={DISCUSSION_STATUS_OPTIONS}
      />
      <div className="mb-4 flex justify-end">{createButton}</div>

      {discussions.length === 0 ? (
        <EmptyState
          title="No discussions"
          description={
            filterStatus
              ? "No discussions with this status. Try a different filter."
              : "Track Tuton discussions here: deadline, Tuton link, status, and your draft response."
          }
          action={filterStatus ? undefined : createButton}
        />
      ) : (
        <ul className="space-y-3">
          {discussions.map((discussion) => (
            <DiscussionCard
              key={discussion.id}
              discussion={discussion}
              onEdit={() => setFormOpen(discussion)}
              onDelete={() => {
                setDeleteError(null);
                setDeleteTarget(discussion);
              }}
            />
          ))}
        </ul>
      )}

      {createOpen ? (
        <Modal title="New discussion" onClose={() => setFormOpen(null)}>
          <DiscussionForm
            courseId={courseId}
            submitLabel="Create discussion"
            onSubmit={submitCreate}
            onCancel={() => setFormOpen(null)}
          />
        </Modal>
      ) : null}

      {editing ? (
        <Modal
          title={`Edit discussion: ${editing.title}`}
          onClose={() => setFormOpen(null)}
        >
          <DiscussionForm
            key={editing.id}
            courseId={courseId}
            initial={{
              title: editing.title,
              session_id: editing.session_id ?? "",
              deadline: editing.deadline,
              external_url: editing.external_url ?? "",
              response_text: editing.response_text ?? "",
              status: editing.status,
            }}
            submitLabel="Save changes"
            onSubmit={submitEdit}
            onCancel={() => setFormOpen(null)}
          />
        </Modal>
      ) : null}

      {deleteTarget ? (
        <Modal title="Delete discussion" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-slate-600">
            Delete <span className="font-medium">{deleteTarget.title}</span>?
            This action cannot be undone.
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
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitDelete}
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
}

function DiscussionCard({
  discussion,
  onEdit,
  onDelete,
}: {
  discussion: DiscussionRow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <StatusBadge status={discussion.status} />
            {discussion.tuton_sessions ? (
              <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600">
                Session {discussion.tuton_sessions.session_number}
              </span>
            ) : null}
          </div>
          <h3 className="mt-1 text-base font-semibold text-slate-900">
            {discussion.title}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Deadline: {formatAcademicDate(discussion.deadline)}
            {isPastDeadline(discussion.deadline, discussion.status) ? (
              <span className="ml-2 font-medium text-red-600">
                Past deadline
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {discussion.external_url ? (
            <a
              href={discussion.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              Open Tuton
            </a>
          ) : null}
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md px-2.5 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>
      {discussion.response_text ? (
        <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-slate-600">
          {discussion.response_text}
        </p>
      ) : null}
    </li>
  );
}