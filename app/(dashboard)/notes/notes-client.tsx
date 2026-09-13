"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { NoteForm, type NoteFormValues } from "./note-form";
import { createNote, deleteNote, updateNote } from "./actions";
import type { FilterCourse } from "@/components/shared/search-filter-bar";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import type { Course, Material, Note } from "@/types/database";

export type NoteRow = Note & {
  courses: Pick<Course, "code" | "name"> | null;
  materials: Pick<Material, "title"> | null;
};

function noteFormData(values: NoteFormValues) {
  const formData = new FormData();
  formData.append("title", values.title);
  formData.append("content", values.content);
  formData.append("course_id", values.course_id);
  formData.append("material_id", values.material_id);
  return formData;
}

/**
 * Notes list with create/edit/delete. Used by both the global /notes page
 * and the course notes page.
 */
export function NotesClient({
  notes,
  courses,
  fixedCourseId,
}: {
  notes: NoteRow[];
  courses: FilterCourse[];
  fixedCourseId?: string;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState<"create" | Note | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const editing = formOpen && formOpen !== "create" ? formOpen : null;
  const createOpen = formOpen === "create";

  async function submitCreate(values: NoteFormValues) {
    const { error } = await createNote(noteFormData(values));
    if (!error) setFormOpen(null);
    return error ?? null;
  }

  async function submitEdit(values: NoteFormValues) {
    if (!editing) return "Note not found.";
    const { error } = await updateNote(editing.id, noteFormData(values));
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
      const { error } = await deleteNote(deleteTarget.id);
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
      New note
    </button>
  );

  if (notes.length === 0) {
    return (
      <>
        <EmptyState
          title="No notes yet"
          description="Write global notes or course-specific notes, optionally related to a material."
          action={createButton}
        />
        {createOpen ? (
          <Modal title="New note" onClose={() => setFormOpen(null)}>
            <NoteForm
              courses={courses}
              fixedCourseId={fixedCourseId}
              submitLabel="Create note"
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
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {notes.map((note) => (
          <li
            key={note.id}
            className="flex flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {!fixedCourseId ? (
                <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600">
                  {note.courses ? note.courses.code : "Global"}
                </span>
              ) : null}
              {note.materials ? (
                <span className="truncate rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600">
                  {note.materials.title}
                </span>
              ) : null}
            </div>
            <h3 className="mt-1 text-base font-semibold text-slate-900">
              {note.title}
            </h3>
            {note.content ? (
              <p className="mt-2 line-clamp-5 whitespace-pre-line text-sm text-slate-600">
                {note.content}
              </p>
            ) : null}
            <div className="mt-auto flex items-center gap-1 border-t border-slate-100 pt-3">
              <span className="mr-auto text-xs text-slate-400" />
              <button
                type="button"
                onClick={() => setFormOpen(note)}
                className="rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setDeleteTarget(note);
                }}
                className="rounded-md px-2.5 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      {createOpen ? (
        <Modal title="New note" onClose={() => setFormOpen(null)}>
          <NoteForm
            courses={courses}
            fixedCourseId={fixedCourseId}
            submitLabel="Create note"
            onSubmit={submitCreate}
            onCancel={() => setFormOpen(null)}
          />
        </Modal>
      ) : null}

      {editing ? (
        <Modal title={`Edit note: ${editing.title}`} onClose={() => setFormOpen(null)}>
          <NoteForm
            key={editing.id}
            courses={courses}
            fixedCourseId={fixedCourseId}
            initial={{
              title: editing.title,
              content: editing.content ?? "",
              course_id: editing.course_id ?? "",
              material_id: editing.material_id ?? "",
            }}
            submitLabel="Save changes"
            onSubmit={submitEdit}
            onCancel={() => setFormOpen(null)}
          />
        </Modal>
      ) : null}

      {deleteTarget ? (
        <Modal title="Delete note" onClose={() => setDeleteTarget(null)}>
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
