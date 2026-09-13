"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  ASSIGNMENT_STATUS_OPTIONS,
  AssignmentForm,
  type AssignmentFormValues,
} from "./assignment-form";
import {
  createAssignment,
  deleteAssignment,
  getAssignmentFileUrl,
  updateAssignment,
} from "./actions";
import {
  StatusBadge,
  formatAcademicDate,
  isPastDeadline,
} from "@/components/shared/tuton-status";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { uploadWorkspaceFile } from "@/lib/storage";
import type { Assignment, TutonSession } from "@/types/database";

export type AssignmentRow = Assignment & {
  tuton_sessions: Pick<TutonSession, "session_number"> | null;
};

function assignmentFormData(
  values: AssignmentFormValues,
  filePath: string | null
) {
  const formData = new FormData();
  formData.append("title", values.title);
  formData.append("description", values.description);
  formData.append("session_id", values.session_id);
  formData.append("deadline", values.deadline);
  formData.append("status", values.status);
  formData.append("external_url", values.external_url);
  formData.append("file_path", filePath ?? "");
  return formData;
}

/** Assignments list for one course, with status filter and CRUD. */
export function AssignmentsClient({
  courseId,
  assignments,
  filterStatus = "",
}: {
  courseId: string;
  assignments: AssignmentRow[];
  filterStatus?: string;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState<"create" | Assignment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [openingFile, setOpeningFile] = useState<string | null>(null);

  const editing = formOpen && formOpen !== "create" ? formOpen : null;
  const createOpen = formOpen === "create";

  async function handleFileOpen(filePath: string) {
    setFileError(null);
    setOpeningFile(filePath);
    try {
      const { url, error } = await getAssignmentFileUrl(filePath);
      if (error || !url) {
        setFileError(error ?? "Could not open the file.");
        return;
      }
      window.open(url, "_blank", "noopener");
    } finally {
      setOpeningFile(null);
    }
  }

  async function submitCreate(values: AssignmentFormValues) {
    let filePath: string | null = null;
    if (values.file) {
      try {
        filePath = await uploadWorkspaceFile(values.file, "assignments");
      } catch (error) {
        return error instanceof Error ? error.message : "File upload failed.";
      }
    }
    const { error } = await createAssignment(
      courseId,
      assignmentFormData(values, filePath)
    );
    if (!error) setFormOpen(null);
    return error ?? null;
  }

  async function submitEdit(values: AssignmentFormValues) {
    if (!editing) return "Assignment not found.";
    let filePath: string | null = values.removeFile
      ? null
      : (editing.file_path ?? null);
    if (values.file) {
      try {
        filePath = await uploadWorkspaceFile(values.file, "assignments");
      } catch (error) {
        return error instanceof Error ? error.message : "File upload failed.";
      }
    }
    const { error } = await updateAssignment(
      editing.id,
      assignmentFormData(values, filePath)
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
      const { error } = await deleteAssignment(deleteTarget.id);
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
      New assignment
    </button>
  );

  return (
    <>
      <SearchFilterBar
        basePath={`/courses/${courseId}/assignments`}
        status={filterStatus}
        statuses={ASSIGNMENT_STATUS_OPTIONS}
      />
      <div className="mb-4 flex justify-end">{createButton}</div>
      {fileError ? (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {fileError}
        </p>
      ) : null}

      {assignments.length === 0 ? (
        <EmptyState
          title="No assignments"
          description={
            filterStatus
              ? "No assignments with this status. Try a different filter."
              : "Track assignments here: deadline, status, external link, notes, and a file attachment."
          }
          action={filterStatus ? undefined : createButton}
        />
      ) : (
        <ul className="space-y-3">
          {assignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              openingFile={openingFile}
              onOpenFile={handleFileOpen}
              onEdit={() => setFormOpen(assignment)}
              onDelete={() => {
                setDeleteError(null);
                setDeleteTarget(assignment);
              }}
            />
          ))}
        </ul>
      )}

      {createOpen ? (
        <Modal title="New assignment" onClose={() => setFormOpen(null)}>
          <AssignmentForm
            courseId={courseId}
            submitLabel="Create assignment"
            onSubmit={submitCreate}
            onCancel={() => setFormOpen(null)}
          />
        </Modal>
      ) : null}

      {editing ? (
        <Modal
          title={`Edit assignment: ${editing.title}`}
          onClose={() => setFormOpen(null)}
        >
          <AssignmentForm
            key={editing.id}
            courseId={courseId}
            initial={{
              title: editing.title,
              description: editing.description ?? "",
              session_id: editing.session_id ?? "",
              deadline: editing.deadline,
              status: editing.status,
              external_url: editing.external_url ?? "",
              file: null,
              removeFile: false,
              file_path: editing.file_path,
            }}
            submitLabel="Save changes"
            onSubmit={submitEdit}
            onCancel={() => setFormOpen(null)}
          />
        </Modal>
      ) : null}

      {deleteTarget ? (
        <Modal title="Delete assignment" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-slate-600">
            Delete <span className="font-medium">{deleteTarget.title}</span>
            {deleteTarget.file_path ? " and its attached file" : ""}? This
            action cannot be undone.
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

function AssignmentCard({
  assignment,
  openingFile,
  onOpenFile,
  onEdit,
  onDelete,
}: {
  assignment: AssignmentRow;
  openingFile: string | null;
  onOpenFile: (filePath: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <StatusBadge status={assignment.status} />
            {assignment.tuton_sessions ? (
              <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600">
                Session {assignment.tuton_sessions.session_number}
              </span>
            ) : null}
          </div>
          <h3 className="mt-1 text-base font-semibold text-slate-900">
            {assignment.title}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Deadline: {formatAcademicDate(assignment.deadline)}
            {isPastDeadline(assignment.deadline, assignment.status) ? (
              <span className="ml-2 font-medium text-red-600">
                Past deadline
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {assignment.external_url ? (
            <a
              href={assignment.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              Open link
            </a>
          ) : null}
          {assignment.file_path ? (
            <button
              type="button"
              onClick={() => onOpenFile(assignment.file_path!)}
              disabled={openingFile === assignment.file_path}
              className="rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60"
            >
              {openingFile === assignment.file_path ? "Opening..." : "Open file"}
            </button>
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
      {assignment.description ? (
        <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-slate-600">
          {assignment.description}
        </p>
      ) : null}
    </li>
  );
}
