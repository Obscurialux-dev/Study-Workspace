"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Modal } from "@/components/ui/modal";

import { createCourse } from "../courses/actions";
import {
  CourseForm,
  EMPTY_COURSE_FORM,
  type CourseFormValues,
} from "../courses/course-form";

const primaryButton =
  "inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-700";
const outlineButton =
  "inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50";

function toFormData(values: CourseFormValues) {
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) =>
    formData.append(key, value)
  );
  return formData;
}

/**
 * Opens the existing course creation flow (shared CourseForm + createCourse
 * server action) in a modal, so the dashboard can start it in place without
 * duplicating any creation logic.
 */
export function CreateCourseAction({
  label = "New course",
  className = primaryButton,
}: {
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleSubmit(
    values: CourseFormValues
  ): Promise<string | null> {
    const { error } = await createCourse(toFormData(values));
    if (!error) {
      setOpen(false);
      router.refresh();
    }
    return error ?? null;
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      {open ? (
        <Modal title="New course" onClose={() => setOpen(false)}>
          <CourseForm
            initial={EMPTY_COURSE_FORM}
            submitLabel="Create course"
            onSubmit={handleSubmit}
            onCancel={() => setOpen(false)}
          />
        </Modal>
      ) : null}
    </>
  );
}

/**
 * Dashboard quick actions. Add Course reuses the existing creation flow;
 * the others link to the existing pages where their creation flows live.
 */
export function DashboardQuickActions() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Quick actions</h2>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <CreateCourseAction label="Add course" />
        <Link href="/materials" className={outlineButton}>
          Add material
        </Link>
        <Link href="/notes" className={outlineButton}>
          Add note
        </Link>
        <Link href="/tuton" className={outlineButton}>
          View Tuton
        </Link>
        <Link href="/analytics" className={outlineButton}>
          View analytics
        </Link>
      </div>
    </section>
  );
}
