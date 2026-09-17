/**
 * Deterministic academic grade calculations for Exam Preparation (Phase 7).
 *
 * Two weighting levels, which must never be confused:
 *
 *   Level 1 — final course score:
 *     Tuton 30% + UAS 70%
 *
 *   Level 2 — inside the Tuton component (0–100 scale):
 *     Kehadiran/Partisipasi 20% + Diskusi 30% + Tugas 50%
 *
 * Note: the Dashboard workspace progress formula (Tuton 50% /
 * Assignments 25% / Discussions 25%) is a DIFFERENT system and lives in
 * app/(dashboard)/dashboard/page.tsx — it is not touched here.
 *
 * Missing scores are never silently treated as zero: averages include only
 * recorded scores, and callers must label incomplete calculations.
 */

/* --------------------------------- weights -------------------------------- */

/** Kehadiran/Partisipasi default when the user participates in Tuton. */
export const KEHADIRAN_DEFAULT = 100;

/** Tuton internal weights (Level 2). */
export const ATTENDANCE_WEIGHT = 0.2;
export const DISCUSSION_WEIGHT = 0.3;
export const ASSIGNMENT_WEIGHT = 0.5;

/** Final course score weights (Level 1). */
export const TUTON_COMPONENT_WEIGHT = 0.3;
export const UAS_COMPONENT_WEIGHT = 0.7;

/** UAS is recorded on a fixed 0–100 scale. */
export const UAS_MAX = 100;

/* -------------------------------- averages -------------------------------- */

/** Normalizes one recorded score to the 0–100 scale (score_max defaults to 100). */
export function scorePercent(score: number, scoreMax: number | null): number {
  const max = scoreMax && scoreMax > 0 ? scoreMax : 100;
  if (max === 100) return score;
  return (score / max) * 100;
}

/** Average of the recorded (non-null) scores on the 0–100 scale, or null. */
export function averageRecorded(
  scores: (number | null)[],
  scoreMaxes: (number | null)[]
): number | null {
  let total = 0;
  let count = 0;
  for (let i = 0; i < scores.length; i++) {
    const score = scores[i];
    if (score === null || score === undefined) continue;
    total += scorePercent(score, scoreMaxes[i] ?? null);
    count += 1;
  }
  return count > 0 ? total / count : null;
}

/* ------------------------------ tuton + final ----------------------------- */

/** Tuton component (0–100) from discussion and assignment averages. */
export function tutonScore(
  discussionAverage: number | null,
  assignmentAverage: number | null
): number | null {
  if (discussionAverage === null || assignmentAverage === null) return null;
  return (
    KEHADIRAN_DEFAULT * ATTENDANCE_WEIGHT +
    discussionAverage * DISCUSSION_WEIGHT +
    assignmentAverage * ASSIGNMENT_WEIGHT
  );
}

/**
 * Final course score from the Tuton component and UAS.
 * Both parts must exist; null UAS means "Awaiting UAS", never zero.
 */
export function finalCourseScore(
  tuton: number | null,
  uas: number | null
): number | null {
  if (tuton === null || uas === null) return null;
  return tuton * TUTON_COMPONENT_WEIGHT + uas * UAS_COMPONENT_WEIGHT;
}

/** True when any assignment/discussion in the course is still ungraded. */
export function hasUngraded(
  scores: (number | null)[]
): boolean {
  return scores.some((s) => s === null || s === undefined);
}

/* --------------------------------- what-if -------------------------------- */

/**
 * UAS score required to reach a target final score.
 * Returns null when the Tuton component is unknown.
 */
export function requiredUas(
  tuton: number | null,
  targetFinal: number
): number | null {
  if (tuton === null) return null;
  return (targetFinal - tuton * TUTON_COMPONENT_WEIGHT) / UAS_COMPONENT_WEIGHT;
}

/* ------------------------------- formatting ------------------------------- */

/** "90.5" — one decimal, trailing ".0" trimmed, safe for null input. */
export function formatScore(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
