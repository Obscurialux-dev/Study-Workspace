"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import {
  createCourse,
  deleteCourse,
  updateCourse,
} from "./actions";
import {
  CourseForm,
  type CourseFormValues,
  EMPTY_COURSE_FORM,
} from "./course-form";
import { EmptyState } from "@/components/ui/empty-state";
import type { Course } from "@/types/database";

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

function toFormValues(course: Course): CourseFormValues {
  return {
    code: course.code,
    name: course.name,
    description: course.description ?? "",
    semester: course.semester ?? "",
    color: course.color ?? "",
    icon: course.icon ?? "",
  };
}

function toFormData(values: CourseFormValues) {
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) =>
    formData.append(key, value)
  );
  return formData;
}

export function CoursesClient({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [formCourse, setFormCourse] = useState<"create" | Course | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const editing = formCourse && formCourse !== "create" ? formCourse : null;
  const createOpen = formCourse === "create";

  async function submitCreate(values: CourseFormValues) {
    const { error } = await createCourse(toFormData(values));
    if (!error) setFormCourse(null);
    return error ?? null;
  }

  async function submitEdit(values: CourseFormValues) {
    if (!editing) return "Course not found.";
    const { error } = await updateCourse(editing.id, toFormData(values));
    if (!error) setFormCourse(null);
    return error ?? null;
  }

  async function submitDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      const { error } = await deleteCourse(deleteTarget.id);
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
      onClick={() => setFormCourse("create")}
      className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-700"
    >
      New course
    </button>
  );

  if (courses.length === 0) {
    return (
      <>
        <EmptyState
          title="No courses yet"
          description="Create your first course to start organizing Tuton sessions, materials, notes, and exam preparation."
          action={createButton}
        />
        {createOpen ? (
          <Modal title="New course" onClose={() => setFormCourse(null)}>
            <CourseForm
              initial={EMPTY_COURSE_FORM}
              submitLabel="Create course"
              onSubmit={submitCreate}
              onCancel={() => setFormCourse(null)}
            />
          </Modal>
        ) : null}
      </>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end">{createButton}</div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <li
            key={course.id}
            className="flex flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-slate-300"
          >
            <div className="flex items-center gap-3">
              {course.color ? (
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: course.color }}
                  aria-hidden="true"
                />
              ) : null}
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {course.code}
                </p>
                <Link
                  href={`/courses/${course.id}`}
                  className="text-base font-semibold text-slate-900 hover:underline"
                >
                  {course.name}
                </Link>
              </div>
            </div>
            {course.description ? (
              <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                {course.description}
              </p>
            ) : null}
            {course.semester ? (
              <p className="mt-2 text-xs text-slate-500">
                Semester: {course.semester}
              </p>
            ) : null}
            <div className="mt-4 flex items-center gap-1 border-t border-slate-100 pt-3">
              <Link
                href={`/courses/${course.id}`}
                className="rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                Open
              </Link>
              <button
                type="button"
                onClick={() => setFormCourse(course)}
                className="rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setDeleteTarget(course);
                }}
                className="ml-auto rounded-md px-2.5 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      <CourseModals
        createOpen={createOpen}
        editing={editing}
        deleteTarget={deleteTarget}
        deleteError={deleteError}
        deleting={deleting}
        onCloseForm={() => setFormCourse(null)}
        onDeleteClose={() => setDeleteTarget(null)}
        onDeleteConfirm={submitDelete}
        submitCreate={submitCreate}
        submitEdit={submitEdit}
      />
    </>
  );
}

function CourseModals({
  createOpen,
  editing,
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
  editing: Course | null;
  deleteTarget: Course | null;
  deleteError: string | null;
  deleting: boolean;
  onCloseForm: () => void;
  onDeleteClose: () => void;
  onDeleteConfirm: () => void;
  submitCreate: (values: CourseFormValues) => Promise<string | null>;
  submitEdit: (values: CourseFormValues) => Promise<string | null>;
}) {
  return (
    <>
      {createOpen ? (
        <Modal title="New course" onClose={onCloseForm}>
          <CourseForm
            initial={EMPTY_COURSE_FORM}
            submitLabel="Create course"
            onSubmit={submitCreate}
            onCancel={onCloseForm}
          />
        </Modal>
      ) : null}

      {editing ? (
        <Modal
          title={`Edit course: ${editing.code}`}
          onClose={onCloseForm}
        >
          <CourseForm
            key={editing.id}
            initial={toFormValues(editing)}
            submitLabel="Save changes"
            onSubmit={submitEdit}
            onCancel={onCloseForm}
          />
        </Modal>
      ) : null}

      {deleteTarget ? (
        <Modal title="Delete course" onClose={onDeleteClose}>
          <p className="text-sm text-slate-600">
            Delete{" "}
            <span className="font-medium">
              {deleteTarget.code} — {deleteTarget.name}
            </span>
            ? This action cannot be undone.
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
              {deleting ? "Deleting..." : "Delete course"}
            </button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
