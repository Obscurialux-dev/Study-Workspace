"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { MaterialForm, type MaterialFormValues } from "./material-form";
import {
  createMaterial,
  deleteMaterial,
  getWorkspaceFileUrl,
  updateMaterial,
} from "./actions";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import type { FilterCourse } from "@/components/shared/search-filter-bar";
import { uploadWorkspaceFile } from "@/lib/storage";
import type { Course, Material, TutonSession } from "@/types/database";

export type MaterialRow = Material & {
  courses: Pick<Course, "code" | "name"> | null;
  tuton_sessions: Pick<TutonSession, "session_number"> | null;
};

function materialFormData(
  values: MaterialFormValues,
  filePath: string | null
) {
  const formData = new FormData();
  formData.append("title", values.title);
  formData.append("module_name", values.module_name);
  formData.append("topic", values.topic);
  formData.append("session_id", values.session_id);
  formData.append("source", values.source);
  formData.append("content", values.content);
  formData.append("file_path", filePath ?? "");
  return formData;
}

/**
 * Materials list with create/edit/delete and file handling. Used by both
 * the global /materials page and the course materials page.
 */
export function MaterialsClient({
  materials,
  courses,
  fixedCourseId,
}: {
  materials: MaterialRow[];
  courses: FilterCourse[];
  fixedCourseId?: string;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState<"create" | Material | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null);
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
      const { url, error } = await getWorkspaceFileUrl(filePath);
      if (error || !url) {
        setFileError(error ?? "Could not open the file.");
        return;
      }
      window.open(url, "_blank", "noopener");
    } finally {
      setOpeningFile(null);
    }
  }

  async function submitCreate(values: MaterialFormValues) {
    const courseId = fixedCourseId ?? values.course_id;
    let filePath: string | null = null;
    if (values.file) {
      try {
        filePath = await uploadWorkspaceFile(values.file, "materials");
      } catch (error) {
        return error instanceof Error ? error.message : "File upload failed.";
      }
    }
    const { error } = await createMaterial(
      courseId,
      materialFormData(values, filePath)
    );
    if (!error) setFormOpen(null);
    return error ?? null;
  }

  async function submitEdit(values: MaterialFormValues) {
    if (!editing) return "Material not found.";
    let filePath: string | null = values.removeFile
      ? null
      : (editing.file_path ?? null);
    if (values.file) {
      try {
        filePath = await uploadWorkspaceFile(values.file, "materials");
      } catch (error) {
        return error instanceof Error ? error.message : "File upload failed.";
      }
    }
    const { error } = await updateMaterial(
      editing.id,
      materialFormData(values, filePath)
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
      const { error } = await deleteMaterial(deleteTarget.id);
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
      New material
    </button>
  );

  if (materials.length === 0) {
    return (
      <>
        <EmptyState
          title="No materials yet"
          description="Save course materials as text, attach a file, or both. Materials can be linked to a Tuton session."
          action={createButton}
        />
        {createOpen ? (
          <Modal title="New material" onClose={() => setFormOpen(null)}>
            <MaterialForm
              courses={courses}
              fixedCourseId={fixedCourseId}
              submitLabel="Create material"
              onSubmit={submitCreate}
              onCancel={() => setFormOpen(null)}
            />
          </Modal>
        ) : null}
      </>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end">{createButton}</div>
      {fileError ? (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {fileError}
        </p>
      ) : null}
      <ul className="space-y-3">
        {materials.map((material) => (
          <MaterialCard
            key={material.id}
            material={material}
            fixedCourseId={fixedCourseId}
            openingFile={openingFile}
            onOpenFile={handleFileOpen}
            onEdit={() => setFormOpen(material)}
            onDelete={() => {
              setDeleteError(null);
              setDeleteTarget(material);
            }}
          />
        ))}
      </ul>
      <MaterialModals
        createOpen={createOpen}
        editing={editing}
        courses={courses}
        fixedCourseId={fixedCourseId}
        deleteTarget={deleteTarget}
        deleteError={deleteError}
        deleting={deleting}
        onCloseForm={() => setFormOpen(null)}
        onDeleteClose={() => setDeleteTarget(null)}
        onDeleteConfirm={submitDelete}
        submitCreate={submitCreate}
        submitEdit={submitEdit}
      />
    </>
  );
}

function MaterialCard({
  material,
  fixedCourseId,
  openingFile,
  onOpenFile,
  onEdit,
  onDelete,
}: {
  material: MaterialRow;
  fixedCourseId?: string;
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
            {!fixedCourseId && material.courses ? (
              <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600">
                {material.courses.code}
              </span>
            ) : null}
            {material.tuton_sessions ? (
              <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600">
                Session {material.tuton_sessions.session_number}
              </span>
            ) : null}
            {material.module_name ? (
              <span className="text-slate-500">{material.module_name}</span>
            ) : null}
            {material.topic ? (
              <span className="text-slate-500">{material.topic}</span>
            ) : null}
          </div>
          <h3 className="mt-1 text-base font-semibold text-slate-900">
            {material.title}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {material.file_path ? (
            <button
              type="button"
              onClick={() => onOpenFile(material.file_path!)}
              disabled={openingFile === material.file_path}
              className="rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60"
            >
              {openingFile === material.file_path ? "Opening..." : "Open file"}
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
      {material.content ? (
        <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-slate-600">
          {material.content}
        </p>
      ) : null}
      {material.source ? (
        <p className="mt-2 text-xs text-slate-500">Source: {material.source}</p>
      ) : null}
    </li>
  );
}

function MaterialModals({
  createOpen,
  editing,
  courses,
  fixedCourseId,
  deleteTarget,
  deleteError,
  deleting,
  onCloseForm,
  onDeleteClose,
  onDeleteConfirm,
  submitCreate,
  submitEdit,
}: {
  createOpen: boolean;
  editing: Material | null;
  courses: FilterCourse[];
  fixedCourseId?: string;
  deleteTarget: Material | null;
  deleteError: string | null;
  deleting: boolean;
  onCloseForm: () => void;
  onDeleteClose: () => void;
  onDeleteConfirm: () => void;
  submitCreate: (values: MaterialFormValues) => Promise<string | null>;
  submitEdit: (values: MaterialFormValues) => Promise<string | null>;
}) {
  return (
    <>
      {createOpen ? (
        <Modal title="New material" onClose={onCloseForm}>
          <MaterialForm
            courses={courses}
            fixedCourseId={fixedCourseId}
            submitLabel="Create material"
            onSubmit={submitCreate}
            onCancel={onCloseForm}
          />
        </Modal>
      ) : null}

      {editing ? (
        <Modal
          title={`Edit material: ${editing.title}`}
          onClose={onCloseForm}
        >
          <MaterialForm
            key={editing.id}
            fixedCourseId={editing.course_id}
            initial={{
              course_id: editing.course_id,
              title: editing.title,
              module_name: editing.module_name ?? "",
              topic: editing.topic ?? "",
              session_id: editing.session_id ?? "",
              source: editing.source ?? "",
              content: editing.content ?? "",
              file: null,
              removeFile: false,
              file_path: editing.file_path,
            }}
            submitLabel="Save changes"
            onSubmit={submitEdit}
            onCancel={onCloseForm}
          />
        </Modal>
      ) : null}

      {deleteTarget ? (
        <Modal title="Delete material" onClose={onDeleteClose}>
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
              onClick={onDeleteClose}
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onDeleteConfirm}
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
