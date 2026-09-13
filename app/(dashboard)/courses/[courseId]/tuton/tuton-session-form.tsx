"use client";

import { useState, type FormEvent } from "react";

import { TUTON_STATUSES } from "@/components/shared/tuton-status";

const inputClasses =
  "mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

export type TutonSessionFormValues = {
  title: string;
  start_date: string;
  end_date: string;
  material_label: string;
  activity_label: string;
  activity_type: string;
  status: string;
  notes: string;
};

/**
 * Edit form for a single Tuton session. Session numbers are fixed (1-8)
 * and are not editable.
 */
export function TutonSessionForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: TutonSessionFormValues;
  submitLabel: string;
  onSubmit: (values: TutonSessionFormValues) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<TutonSessionFormValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function set(key: keyof TutonSessionFormValues, value: string) {
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
          htmlFor="tuton-title"
          className="block text-sm font-medium text-slate-700"
        >
          Title <span className="text-red-600">*</span>
        </label>
        <input
          id="tuton-title"
          type="text"
          required
          value={values.title}
          onChange={(event) => set("title", event.target.value)}
          className={inputClasses}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="tuton-start"
            className="block text-sm font-medium text-slate-700"
          >
            Start date <span className="text-red-600">*</span>
          </label>
          <input
            id="tuton-start"
            type="date"
            required
            value={values.start_date}
            onChange={(event) => set("start_date", event.target.value)}
            className={inputClasses}
          />
        </div>
        <div>
          <label
            htmlFor="tuton-end"
            className="block text-sm font-medium text-slate-700"
          >
            End date <span className="text-red-600">*</span>
          </label>
          <input
            id="tuton-end"
            type="date"
            required
            value={values.end_date}
            onChange={(event) => set("end_date", event.target.value)}
            className={inputClasses}
          />
        </div>
      </div>
      <FormFields values={values} set={set} />
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <FormActions onCancel={onCancel} pending={pending} label={submitLabel} />
    </form>
  );
}

function FormFields({
  values,
  set,
}: {
  values: TutonSessionFormValues;
  set: (key: keyof TutonSessionFormValues, value: string) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="tuton-material"
            className="block text-sm font-medium text-slate-700"
          >
            Material / inisiasi
          </label>
          <input
            id="tuton-material"
            type="text"
            value={values.material_label}
            onChange={(event) => set("material_label", event.target.value)}
            placeholder="e.g. Inisiasi 1"
            className={inputClasses}
          />
        </div>
        <div>
          <label
            htmlFor="tuton-activity"
            className="block text-sm font-medium text-slate-700"
          >
            Activity
          </label>
          <input
            id="tuton-activity"
            type="text"
            value={values.activity_label}
            onChange={(event) => set("activity_label", event.target.value)}
            placeholder="e.g. Diskusi 1"
            className={inputClasses}
          />
        </div>
        <div>
          <label
            htmlFor="tuton-activity-type"
            className="block text-sm font-medium text-slate-700"
          >
            Activity type
          </label>
          <select
            id="tuton-activity-type"
            value={values.activity_type}
            onChange={(event) => set("activity_type", event.target.value)}
            className={inputClasses}
          >
            <option value="discussion">Discussion</option>
            <option value="assignment">Assignment</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="tuton-status"
            className="block text-sm font-medium text-slate-700"
          >
            Status
          </label>
          <select
            id="tuton-status"
            value={values.status}
            onChange={(event) => set("status", event.target.value)}
            className={inputClasses}
          >
            {TUTON_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label
          htmlFor="tuton-notes"
          className="block text-sm font-medium text-slate-700"
        >
          Notes
        </label>
        <textarea
          id="tuton-notes"
          rows={3}
          value={values.notes}
          onChange={(event) => set("notes", event.target.value)}
          className={inputClasses}
        />
      </div>
    </>
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
