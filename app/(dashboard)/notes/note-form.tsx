"use client";

import { useEffect, useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";
import type { FilterCourse } from "@/components/shared/search-filter-bar";
import type { Material } from "@/types/database";

type MaterialOption = Pick<Material, "id" | "title">;

const inputClasses =
  "mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

export type NoteFormValues = {
  title: string;
  content: string;
  course_id: string;
  material_id: string;
};

/**
 * Create/edit form for a note. When `fixedCourseId` is set the note is
 * scoped to that course (course pages); otherwise the course is optional
 * and selectable (global notes page).
 */
export function NoteForm({
  courses,
  fixedCourseId,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  courses?: FilterCourse[];
  fixedCourseId?: string;
  initial?: NoteFormValues;
  submitLabel: string;
  onSubmit: (values: NoteFormValues) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<NoteFormValues>(
    initial ?? {
      title: "",
      content: "",
      course_id: fixedCourseId ?? "",
      material_id: "",
    }
  );
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const effectiveCourseId = fixedCourseId ?? values.course_id;

  // Load the course's materials for the optional material relation.
  useEffect(() => {
    let active = true;
    if (!effectiveCourseId) return;
    createClient()
      .from("materials")
      .select("id, title")
      .eq("course_id", effectiveCourseId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (active) setMaterials(data ?? []);
      });
    return () => {
      active = false;
    };
  }, [effectiveCourseId]);

  function set(key: keyof NoteFormValues, value: string) {
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
          htmlFor="note-title"
          className="block text-sm font-medium text-slate-700"
        >
          Title <span className="text-red-600">*</span>
        </label>
        <input
          id="note-title"
          type="text"
          required
          value={values.title}
          onChange={(event) => set("title", event.target.value)}
          placeholder="e.g. Ringkasan Modul 1"
          className={inputClasses}
        />
      </div>
      {!fixedCourseId ? (
        <div>
          <label
            htmlFor="note-course"
            className="block text-sm font-medium text-slate-700"
          >
            Course
          </label>
          <select
            id="note-course"
            value={values.course_id}
            onChange={(event) => {
              set("course_id", event.target.value);
              set("material_id", "");
              setMaterials([]);
            }}
            className={inputClasses}
          >
            <option value="">No course (global note)</option>
            {(courses ?? []).map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} — {course.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div>
        <label
          htmlFor="note-material"
          className="block text-sm font-medium text-slate-700"
        >
          Related material
        </label>
        <select
          id="note-material"
          value={values.material_id}
          onChange={(event) => set("material_id", event.target.value)}
          className={inputClasses}
          disabled={materials.length === 0}
        >
          <option value="">No material</option>
          {materials.map((material) => (
            <option key={material.id} value={material.id}>
              {material.title}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          htmlFor="note-content"
          className="block text-sm font-medium text-slate-700"
        >
          Content
        </label>
        <textarea
          id="note-content"
          rows={8}
          value={values.content}
          onChange={(event) => set("content", event.target.value)}
          placeholder="Write your note..."
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
