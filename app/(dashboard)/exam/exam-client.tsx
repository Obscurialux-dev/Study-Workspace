"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  createExamTopic,
  deleteExamTopic,
  saveAssignmentScore,
  saveDiscussionScore,
  saveUasScore,
  updateExamTopic,
} from "./actions";
import { StatusBadge } from "@/components/shared/tuton-status";
import { Modal } from "@/components/ui/modal";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  ATTENDANCE_WEIGHT,
  ASSIGNMENT_WEIGHT,
  DISCUSSION_WEIGHT,
  KEHADIRAN_DEFAULT,
  TUTON_COMPONENT_WEIGHT,
  UAS_COMPONENT_WEIGHT,
  UAS_MAX,
  averageRecorded,
  finalCourseScore,
  formatScore,
  hasUngraded,
  requiredUas,
  tutonScore,
} from "@/lib/exam";
import type { Assignment, Course, Discussion, ExamTopic } from "@/types/database";

export type ExamCourseData = {
  course: Course;
  assignments: Assignment[];
  discussions: Discussion[];
  topics: ExamTopic[];
  materials: { id: string; title: string; module_name: string | null }[];
};

/* --------------------------------- styles --------------------------------- */

const primaryButton =
  "inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50";
const outlineButton =
  "inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50";
const textButton =
  "rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100";
const dangerTextButton =
  "rounded-md px-2.5 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50";
const inputClasses =
  "h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
const selectClasses =
  "h-9 rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-700 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";
const cardClasses = "rounded-lg border border-slate-200 bg-white p-5 shadow-sm";
const sectionTitleClasses =
  "text-sm font-semibold uppercase tracking-wide text-slate-500";

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={cardClasses}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className={sectionTitleClasses}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Small summary tile used by the academic summary. */
function SummaryTile({
  label,
  weight,
  value,
  detail,
}: {
  label: string;
  weight?: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
        {weight ? (
          <span className="ml-1.5 font-normal normal-case text-slate-400">
            {weight}
          </span>
        ) : null}
      </p>
      <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
      {detail ? <p className="mt-0.5 text-xs text-slate-500">{detail}</p> : null}
    </div>
  );
}

/* ------------------------------- score modal ------------------------------ */

type ScoreTarget = {
  kind: "discussion" | "assignment";
  id: string;
  title: string;
  score: number | null;
  scoreMax: number | null;
  feedback: string | null;
};

function ScoreModal({
  target,
  onClose,
}: {
  target: ScoreTarget;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setError(null);
    const { error } =
      target.kind === "discussion"
        ? await saveDiscussionScore(target.id, formData)
        : await saveAssignmentScore(target.id, formData);
    setSaving(false);
    if (error) {
      setError(error);
      return;
    }
    onClose();
  }

  return (
    <Modal title={`Record score — ${target.title}`} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit(new FormData(event.currentTarget));
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="score" className="mb-1 block text-sm font-medium text-slate-700">
            Score
          </label>
          <input
            id="score"
            name="score"
            type="number"
            step="any"
            min="0"
            defaultValue={target.score ?? ""}
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor="score_max" className="mb-1 block text-sm font-medium text-slate-700">
            Max score (default 100)
          </label>
          <input
            id="score_max"
            name="score_max"
            type="number"
            step="any"
            min="0"
            defaultValue={target.scoreMax ?? 100}
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor="feedback" className="mb-1 block text-sm font-medium text-slate-700">
            Feedback / comment (optional)
          </label>
          <textarea
            id="feedback"
            name="feedback"
            rows={3}
            defaultValue={target.feedback ?? ""}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <p className="text-xs text-slate-500">
          Leave the score empty to mark this item as not graded yet.
        </p>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={outlineButton}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? "Saving..." : "Save score"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* -------------------------------- topic form ------------------------------ */

const TOPIC_STATUS_OPTIONS = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

type TopicFormValues = {
  title: string;
  description: string;
  notes: string;
  status: string;
  material_id: string;
};

function TopicModal({
  courseId,
  materials,
  editing,
  onClose,
}: {
  courseId: string;
  materials: ExamCourseData["materials"];
  editing: ExamTopic | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<TopicFormValues>({
    title: editing?.title ?? "",
    description: editing?.description ?? "",
    notes: editing?.notes ?? "",
    status: editing?.status ?? "not_started",
    material_id: editing?.material_id ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof TopicFormValues>(key: K, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.append(key, value));
    const { error } = editing
      ? await updateExamTopic(editing.id, formData)
      : await createExamTopic(courseId, formData);
    setSaving(false);
    if (error) {
      setError(error);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <Modal title={editing ? "Edit topic" : "New study topic"} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="topic-title" className="mb-1 block text-sm font-medium text-slate-700">
            Title
          </label>
          <input
            id="topic-title"
            value={values.title}
            onChange={(event) => update("title", event.target.value)}
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor="topic-description" className="mb-1 block text-sm font-medium text-slate-700">
            Description (optional)
          </label>
          <textarea
            id="topic-description"
            rows={2}
            value={values.description ?? ""}
            onChange={(event) => update("description", event.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <div>
          <label htmlFor="topic-notes" className="mb-1 block text-sm font-medium text-slate-700">
            Notes (optional)
          </label>
          <textarea
            id="topic-notes"
            rows={2}
            value={values.notes ?? ""}
            onChange={(event) => update("notes", event.target.value)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="topic-status" className="mb-1 block text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              id="topic-status"
              value={values.status}
              onChange={(event) => update("status", event.target.value)}
              className={`${selectClasses} w-full`}
            >
              {TOPIC_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="topic-material" className="mb-1 block text-sm font-medium text-slate-700">
              Related material (optional)
            </label>
            <select
              id="topic-material"
              value={values.material_id ?? ""}
              onChange={(event) => update("material_id", event.target.value)}
              className={`${selectClasses} w-full`}
            >
              <option value="">None</option>
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.module_name ? `${material.module_name} — ` : ""}
                  {material.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={outlineButton}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? "Saving..." : editing ? "Save changes" : "Create topic"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------- score list ------------------------------- */

const SCORE_STATUS_STYLES: Record<string, string> = {
  graded: "bg-emerald-50 text-emerald-700",
  ungraded: "bg-slate-100 text-slate-600",
};

/**
 * One row per Discussion/Assignment with its recorded score (if any).
 * Individual scores stay visible; averages never replace them.
 */
function ScoreList({
  items,
  kind,
  onRecord,
}: {
  items: (Discussion | Assignment)[];
  kind: "discussion" | "assignment";
  onRecord: (target: ScoreTarget) => void;
}) {
  if (items.length === 0) {
    const label = kind === "discussion" ? "Discussion" : "Assignment";
    return (
      <p className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
        No {label} scores recorded yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
      {items.map((item) => {
        const graded = item.score !== null;
        return (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">
                {item.title}
              </p>
              {item.feedback ? (
                <p className="truncate text-xs text-slate-500">{item.feedback}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  graded
                    ? SCORE_STATUS_STYLES.graded
                    : SCORE_STATUS_STYLES.ungraded
                }`}
              >
                {graded
                  ? `${formatScore(item.score)} / ${formatScore(item.score_max)}`
                  : "Not graded"}
              </span>
              <button
                type="button"
                onClick={() =>
                  onRecord({
                    kind,
                    id: item.id,
                    title: item.title,
                    score: item.score,
                    scoreMax: item.score_max,
                    feedback: item.feedback,
                  })
                }
                className={textButton}
              >
                Record score
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------------------- what-if calculator --------------------------- */

/** Pure math planning tool: target final -> required UAS. No predictions. */
function WhatIfCalculator({ tuton }: { tuton: number | null }) {
  const [target, setTarget] = useState("80");

  const parsed = Number(target.replace(",", "."));
  const valid = target.trim() !== "" && Number.isFinite(parsed);
  const needed = valid && tuton !== null ? requiredUas(tuton, parsed) : null;

  let message: string | null = null;
  if (tuton === null) {
    message = "Record at least one Discussion score and one Tugas score first.";
  } else if (valid && needed !== null) {
    if (needed > UAS_MAX) {
      message = "This target cannot be reached with a maximum UAS score of 100.";
    } else if (needed <= 0) {
      message =
        "The target is already mathematically achievable based on the current Tuton score.";
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <label
            htmlFor="whatif-target"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Target final
          </label>
          <input
            id="whatif-target"
            type="number"
            step="any"
            inputMode="decimal"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            className={inputClasses}
          />
        </div>
        <div className="flex-1">
          <p className="mb-1 text-sm font-medium text-slate-700">Required UAS</p>
          <p className="text-xl font-semibold tracking-tight text-slate-900">
            {tuton === null || !valid || needed === null
              ? "—"
              : needed > UAS_MAX || needed <= 0
                ? "—"
                : formatScore(needed)}
          </p>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Required UAS = (Target final − Tuton × {TUTON_COMPONENT_WEIGHT}) /{" "}
        {UAS_COMPONENT_WEIGHT}. Mathematical planning only — it does not predict
        exam results.
      </p>
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
    </div>
  );
}

/* -------------------------------- uas entry ------------------------------- */

/** Inline entry for the recorded UAS score (0–100). Empty = not entered. */
function UasEntry({ course }: { course: Course }) {
  const [value, setValue] = useState(
    course.uas_score !== null ? String(course.uas_score) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(score: string) {
    setSaving(true);
    setError(null);
    const formData = new FormData();
    formData.append("uas_score", score);
    const { error } = await saveUasScore(course.id, formData);
    setSaving(false);
    setError(error ?? null);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit(value);
      }}
      className="mt-2 flex flex-wrap items-center gap-2"
    >
      <input
        aria-label="UAS score"
        type="number"
        step="any"
        min="0"
        max="100"
        inputMode="decimal"
        placeholder="UAS score (0–100)"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className={`${inputClasses} w-40`}
      />
      <button type="submit" disabled={saving} className={outlineButton + " h-9"}>
        {saving ? "Saving..." : "Save"}
      </button>
      {course.uas_score !== null ? (
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            setValue("");
            void submit("");
          }}
          className={outlineButton + " h-9"}
        >
          Clear
        </button>
      ) : null}
      {error ? <p className="w-full text-sm text-red-600">{error}</p> : null}
    </form>
  );
}

/* ------------------------------- study topics ------------------------------ */

const TOPIC_GLYPHS: Record<string, string> = {
  not_started: "\u25CB",
  in_progress: "\u25D0",
  completed: "\u2713",
};

const TOPIC_GLYPH_STYLES: Record<string, string> = {
  not_started: "text-slate-400",
  in_progress: "text-blue-600",
  completed: "text-emerald-600",
};

function TopicList({
  data,
  onEdit,
  onDelete,
}: {
  data: ExamCourseData;
  onEdit: (topic: ExamTopic) => void;
  onDelete: (topic: ExamTopic) => void;
}) {
  if (data.topics.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
        No exam preparation topics yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
      {data.topics.map((topic) => {
        const material = topic.material_id
          ? data.materials.find((m) => m.id === topic.material_id)
          : null;
        return (
          <li key={topic.id} className="px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2">
                <span
                  aria-hidden="true"
                  className={`mt-0.5 text-base leading-5 ${
                    TOPIC_GLYPH_STYLES[topic.status] ?? "text-slate-400"
                  }`}
                >
                  {TOPIC_GLYPHS[topic.status] ?? "\u25CB"}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{topic.title}</p>
                  {topic.description ? (
                    <p className="mt-0.5 text-xs text-slate-500">{topic.description}</p>
                  ) : null}
                  {material ? (
                    <Link
                      href={`/courses/${data.course.id}/materials`}
                      className="mt-1 inline-block rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200"
                    >
                      Material: {material.module_name ? `${material.module_name} \u2014 ` : ""}
                      {material.title}
                    </Link>
                  ) : null}
                  {topic.notes ? (
                    <p className="mt-1 whitespace-pre-line text-xs text-slate-400">{topic.notes}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <StatusBadge status={topic.status} />
                <button type="button" onClick={() => onEdit(topic)} className={textButton}>
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(topic)}
                  className={dangerTextButton}
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------ course section ----------------------------- */

function CourseExamSection({ data }: { data: ExamCourseData }) {
  const { course, assignments, discussions, topics } = data;
  const [scoreTarget, setScoreTarget] = useState<ScoreTarget | null>(null);
  const [topicForm, setTopicForm] = useState<"create" | ExamTopic | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExamTopic | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Averages use recorded scores only; missing scores are never zeros.
  const discussionAverage = useMemo(
    () => averageRecorded(discussions.map((d) => d.score), discussions.map((d) => d.score_max)),
    [discussions]
  );
  const assignmentAverage = useMemo(
    () => averageRecorded(assignments.map((a) => a.score), assignments.map((a) => a.score_max)),
    [assignments]
  );
  const tuton = tutonScore(discussionAverage, assignmentAverage);
  const final = finalCourseScore(tuton, course.uas_score);
  const tutonIncomplete =
    hasUngraded(discussions.map((d) => d.score)) ||
    hasUngraded(assignments.map((a) => a.score));

  const completedTopics = topics.filter((t) => t.status === "completed").length;
  const preparationProgress =
    topics.length > 0 ? (completedTopics / topics.length) * 100 : 0;

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    const { error } = await deleteExamTopic(deleteTarget.id);
    setDeleting(false);
    if (error) {
      setDeleteError(error);
      return;
    }
    setDeleteTarget(null);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Course header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-4">
        {course.color ? (
          <span
            className="h-4 w-4 shrink-0 rounded-full"
            style={{ backgroundColor: course.color }}
            aria-hidden="true"
          />
        ) : null}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {course.code}
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            {course.name}
          </h2>
        </div>
      </div>

      <div className="space-y-6 p-5">
        {/* Academic summary */}
        <Section title="Academic summary">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryTile
              label="Tuton"
              weight={`${Math.round(TUTON_COMPONENT_WEIGHT * 100)}%`}
              value={tuton === null ? "\u2014" : `${formatScore(tuton)} / 100`}
              detail={
                tuton === null
                  ? "Record Discussion and Tugas scores"
                  : tutonIncomplete
                    ? "Estimated \u2014 some items ungraded"
                    : "Complete"
              }
            />
            <SummaryTile
              label="UAS"
              weight={`${Math.round(UAS_COMPONENT_WEIGHT * 100)}%`}
              value={
                course.uas_score === null ? "Not entered" : `${formatScore(course.uas_score)} / 100`
              }
              detail={course.uas_score === null ? "Awaiting UAS" : "Recorded"}
            />
            <SummaryTile
              label="Final"
              value={
                final === null
                  ? tuton === null
                    ? "Awaiting scores"
                    : "Awaiting UAS"
                  : formatScore(final)
              }
              detail={
                final === null
                  ? "Missing scores are never treated as zero"
                  : tutonIncomplete
                    ? "Estimated final course score"
                    : "Final course score"
              }
            />
          </div>
          <div className="mt-4 rounded-md border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-700">UAS score entry</p>
            <UasEntry course={course} />
          </div>
        </Section>

        {/* Preparation progress */}
        <Section
          title="Exam preparation"
          action={
            <button
              type="button"
              onClick={() => setTopicForm("create")}
              className={outlineButton + " h-9"}
            >
              Add topic
            </button>
          }
        >
          <p className="mb-2 text-sm text-slate-700">
            {completedTopics} / {topics.length} topic{topics.length === 1 ? "" : "s"} completed
            {topics.length > 0 ? ` \u2014 ${Math.round(preparationProgress)}%` : ""}
          </p>
          <ProgressBar value={preparationProgress} />

          <div className="mt-4">
            <TopicList
              data={data}
              onEdit={(topic) => setTopicForm(topic)}
              onDelete={(topic) => {
                setDeleteError(null);
                setDeleteTarget(topic);
              }}
            />
          </div>
        </Section>

        {/* Tuton scores */}
        <Section title="Tuton scores">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Kehadiran / Partisipasi</p>
                <p className="text-xs text-slate-500">
                  Default 100 when participating in Tuton (no per-session entry needed)
                </p>
              </div>
              <span className="text-sm font-semibold text-slate-900">
                {KEHADIRAN_DEFAULT} / 100
              </span>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">
                Diskusi{" "}
                <span className="font-normal text-slate-400">
                  ({Math.round(DISCUSSION_WEIGHT * 100)}% of Tuton)
                </span>
              </p>
              <ScoreList items={discussions} kind="discussion" onRecord={setScoreTarget} />
              <p className="mt-2 text-xs text-slate-500">
                Average: {discussionAverage === null ? "\u2014" : formatScore(discussionAverage)}
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">
                Tugas{" "}
                <span className="font-normal text-slate-400">
                  ({Math.round(ASSIGNMENT_WEIGHT * 100)}% of Tuton)
                </span>
              </p>
              <ScoreList items={assignments} kind="assignment" onRecord={setScoreTarget} />
              <p className="mt-2 text-xs text-slate-500">
                Average: {assignmentAverage === null ? "\u2014" : formatScore(assignmentAverage)}
              </p>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">Tuton score</p>
                <span className="text-sm font-semibold text-slate-900">
                  {tuton === null ? "\u2014" : `${formatScore(tuton)} / 100`}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Tuton = (Kehadiran × {ATTENDANCE_WEIGHT}) + (Diskusi average ×{" "}
                {DISCUSSION_WEIGHT}) + (Tugas average × {ASSIGNMENT_WEIGHT})
              </p>
              {tuton !== null && tutonIncomplete ? (
                <p className="mt-1 text-xs font-medium text-amber-600">
                  Estimated — ungraded items are excluded, not counted as zero.
                </p>
              ) : null}
            </div>
          </div>
        </Section>

        {/* What-if calculator */}
        <Section title="What-if UAS calculator">
          <WhatIfCalculator tuton={tuton} />
        </Section>
      </div>

      {/* Modals */}
      {scoreTarget ? (
        <ScoreModal target={scoreTarget} onClose={() => setScoreTarget(null)} />
      ) : null}
      {topicForm ? (
        <TopicModal
          courseId={course.id}
          materials={data.materials}
          editing={topicForm === "create" ? null : topicForm}
          onClose={() => setTopicForm(null)}
        />
      ) : null}
      {deleteTarget ? (
        <Modal title="Delete topic" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-slate-600">
            Delete “{deleteTarget.title}”? This cannot be undone.
          </p>
          {deleteError ? <p className="mt-2 text-sm text-red-600">{deleteError}</p> : null}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className={outlineButton}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="inline-flex h-10 items-center justify-center rounded-md bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

/* -------------------------------- workspace -------------------------------- */

/** Exam preparation workspace: course filter + one isolated section per course. */
export function ExamWorkspace({
  courses,
  courseFilter,
}: {
  courses: ExamCourseData[];
  courseFilter: string;
}) {
  const router = useRouter();

  function changeFilter(value: string) {
    router.replace(value ? `/exam?course=${value}` : "/exam", { scroll: false });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="exam-course-filter" className="text-sm font-medium text-slate-700">
          Course
        </label>
        <select
          id="exam-course-filter"
          aria-label="Filter by course"
          value={courseFilter}
          onChange={(event) => changeFilter(event.target.value)}
          className={selectClasses}
        >
          <option value="">All courses</option>
          {courses.map((data) => (
            <option key={data.course.id} value={data.course.id}>
              {data.course.code} — {data.course.name}
            </option>
          ))}
        </select>
      </div>

      {courses.map((data) => (
        <CourseExamSection key={data.course.id} data={data} />
      ))}
    </div>
  );
}
