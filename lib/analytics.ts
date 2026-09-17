import {
  averageRecorded,
  finalCourseScore,
  formatScore,
  hasUngraded,
  tutonScore,
} from "@/lib/exam";
import { addDaysIso, WEEKDAY_SHORTS } from "@/lib/planner";

/**
 * Deterministic Study Analytics metrics (Phase 9).
 *
 * Everything here is derived from rows that already exist in the workspace
 * (courses, tuton_sessions, materials, notes, assignments, discussions,
 * exam_topics, questions, quiz_attempts). There are NO analytics tables, no
 * snapshots, no AI and no new grade formula:
 *
 * - academic scores come from `lib/exam.ts` (the single source of truth);
 * - quiz scores are practice-only and never affect grades;
 * - "overdue" is a DERIVED condition (deadline/date vs today). The stored
 *   statuses are never mutated by analytics;
 * - percentages with no underlying records are `null` ("No data") instead of
 *   a misleading 0%.
 */

/* ------------------------------- input types ------------------------------ */

export type AnalyticsCourse = {
  id: string;
  code: string;
  name: string;
  uas_score: number | null;
};

export type AnalyticsSession = {
  course_id: string;
  status: string;
  start_date: string;
  end_date: string;
};

export type AnalyticsDeadlineItem = {
  course_id: string;
  status: string;
  deadline: string;
  score: number | null;
  score_max: number | null;
  created_at: string;
  updated_at: string;
};

export type AnalyticsTopic = {
  course_id: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type AnalyticsActivityRow = {
  course_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AnalyticsAttempt = {
  course_id: string;
  started_at: string;
  completed_at: string | null;
  score: number;
};

export type AnalyticsInputs = {
  /** Courses included in this calculation (one course when filtered). */
  courses: AnalyticsCourse[];
  sessions: AnalyticsSession[];
  assignments: AnalyticsDeadlineItem[];
  discussions: AnalyticsDeadlineItem[];
  materials: AnalyticsActivityRow[];
  notes: AnalyticsActivityRow[];
  topics: AnalyticsTopic[];
  questions: AnalyticsActivityRow[];
  attempts: AnalyticsAttempt[];
  /** Today in Asia/Jakarta (YYYY-MM-DD) — use lib/planner.todayIso(). */
  today: string;
};

/* -------------------------------- completion ------------------------------- */

export type CompletionMetric = {
  total: number;
  completed: number;
  /** null when there is nothing to complete ("No data" in the UI). */
  percent: number | null;
};

function percentOf(completed: number, total: number): number | null {
  if (total <= 0) return null;
  return (completed / total) * 100;
}

/** Completion of items that use the existing status vocabulary. */
export function completionOf(items: { status: string }[]): CompletionMetric {
  const completed = items.filter((item) => item.status === "completed").length;
  return {
    total: items.length,
    completed,
    percent: percentOf(completed, items.length),
  };
}

/* ---------------------------------- tuton --------------------------------- */

export type TutonMetrics = CompletionMetric & {
  active: number;
  upcoming: number;
  overdue: number;
};

/**
 * Tuton buckets. `active`/`upcoming`/`overdue` are derived from the official
 * dates; a session keeps whatever status the user stored.
 */
export function tutonMetrics(
  sessions: AnalyticsSession[],
  today: string
): TutonMetrics {
  const completion = completionOf(sessions);
  let active = 0;
  let upcoming = 0;
  let overdue = 0;

  for (const session of sessions) {
    if (session.status === "completed") continue;
    if (session.end_date < today) overdue += 1;
    else if (session.start_date > today) upcoming += 1;
    else active += 1;
  }

  return { ...completion, active, upcoming, overdue };
}

/* ---------------------------------- topics -------------------------------- */

export type TopicMetrics = CompletionMetric & {
  inProgress: number;
  notStarted: number;
};

/**
 * Exam preparation topics, using the existing status vocabulary
 * (not_started / in_progress / completed) exactly as stored.
 */
export function topicMetrics(items: { status: string }[]): TopicMetrics {
  const completion = completionOf(items);
  return {
    ...completion,
    inProgress: items.filter((item) => item.status === "in_progress").length,
    notStarted: items.filter((item) => item.status === "not_started").length,
  };
}

/* -------------------------------- deadlines ------------------------------- */

export type DeadlineMetrics = CompletionMetric & {
  incomplete: number;
  overdue: number;
};

/** Assignments/discussions: existing statuses + derived overdue count. */
export function deadlineMetrics(
  items: AnalyticsDeadlineItem[],
  today: string
): DeadlineMetrics {
  const completion = completionOf(items);
  const overdue = items.filter(
    (item) => item.status !== "completed" && item.deadline < today
  ).length;
  return {
    ...completion,
    incomplete: completion.total - completion.completed,
    overdue,
  };
}

/* ----------------------------------- quiz --------------------------------- */

export type QuizMetrics = {
  attempts: number;
  completedAttempts: number;
  averageScore: number | null;
  bestScore: number | null;
  latestScore: number | null;
};

/**
 * Quiz metrics use COMPLETED attempts only: an in-progress attempt has no final
 * score, so it is excluded from the average, the best and the latest score.
 */
export function quizMetrics(attempts: AnalyticsAttempt[]): QuizMetrics {
  const completed = attempts.filter((attempt) => attempt.completed_at !== null);
  if (completed.length === 0) {
    return {
      attempts: attempts.length,
      completedAttempts: 0,
      averageScore: null,
      bestScore: null,
      latestScore: null,
    };
  }

  const scores = completed.map((attempt) => attempt.score);
  const latest = completed.reduce((newest, attempt) =>
    (attempt.completed_at ?? "") > (newest.completed_at ?? "")
      ? attempt
      : newest
  );

  return {
    attempts: attempts.length,
    completedAttempts: completed.length,
    averageScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
    bestScore: Math.max(...scores),
    latestScore: latest.score,
  };
}

/* --------------------------------- academic -------------------------------- */

export type AcademicMetrics = {
  tutonScore: number | null;
  uasScore: number | null;
  finalScore: number | null;
  /** True when at least one discussion/assignment grade or the UAS exists. */
  hasRecordedScores: boolean;
  /** True when some discussion/assignment has no recorded grade yet. */
  hasUngradedItems: boolean;
};

/**
 * Academic scores per course. This only re-presents the existing Phase 7
 * calculation from `lib/exam.ts` — analytics never defines a new formula and
 * never mixes quiz scores into grades.
 */
export function academicMetrics(
  course: AnalyticsCourse,
  assignments: AnalyticsDeadlineItem[],
  discussions: AnalyticsDeadlineItem[]
): AcademicMetrics {
  const discussionAverage = averageRecorded(
    discussions.map((item) => item.score),
    discussions.map((item) => item.score_max)
  );
  const assignmentAverage = averageRecorded(
    assignments.map((item) => item.score),
    assignments.map((item) => item.score_max)
  );
  const tuton = tutonScore(discussionAverage, assignmentAverage);
  const uas = course.uas_score;

  return {
    tutonScore: tuton,
    uasScore: uas,
    finalScore: finalCourseScore(tuton, uas),
    hasRecordedScores:
      [...discussions, ...assignments].some((item) => item.score !== null) ||
      uas !== null,
    hasUngradedItems: hasUngraded([
      ...discussions.map((item) => item.score),
      ...assignments.map((item) => item.score),
    ]),
  };
}

/* --------------------------------- activity -------------------------------- */

/** Timestamps of one existing record (created_at/updated_at style). */
export type ActivityRecord = { timestamps: (string | null)[] };

export type ActivityDay = {
  dateIso: string;
  label: string;
  count: number;
};

export type ActivitySummary = {
  /** Recorded activities inside the 7-day window below. */
  last7Days: number;
  /** Recorded activities in the last 30 days (includes the 7-day window). */
  last30Days: number;
  /** The 7-day window ending today, oldest first (drives the bar chart). */
  week: ActivityDay[];
  /** Largest daily count in the window (0 when there is no activity). */
  maxDaily: number;
};

const JAKARTA_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
});

/** Local Asia/Jakarta calendar date (YYYY-MM-DD) of a timestamp, or null. */
function localDate(timestamp: string | null): string | null {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  return JAKARTA_DATE.format(date);
}

/** "Mon" for a YYYY-MM-DD date (Mon-based, same labels as the Planner). */
function weekdayLabel(dateIso: string): string {
  const day = new Date(`${dateIso}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  return WEEKDAY_SHORTS[(day + 6) % 7];
}

/**
 * Counts "recorded activity" events: one event per record per local day, taken
 * from the existing created_at / updated_at (or started_at / completed_at)
 * timestamps. This is a COUNT of recorded activity — the application has no
 * time tracking, so it is never presented as study hours.
 */
export function activitySummary(
  records: ActivityRecord[],
  today: string
): ActivitySummary {
  const counts = new Map<string, number>();

  for (const record of records) {
    const days = new Set<string>();
    for (const timestamp of record.timestamps) {
      const dateIso = localDate(timestamp);
      if (dateIso) days.add(dateIso);
    }
    for (const dateIso of days) {
      counts.set(dateIso, (counts.get(dateIso) ?? 0) + 1);
    }
  }

  const week: ActivityDay[] = [];
  let last7Days = 0;
  for (let offset = 6; offset >= 0; offset -= 1) {
    const dateIso = addDaysIso(today, -offset);
    const count = counts.get(dateIso) ?? 0;
    last7Days += count;
    week.push({ dateIso, label: weekdayLabel(dateIso), count });
  }

  const from30 = addDaysIso(today, -29);
  let last30Days = 0;
  for (const [dateIso, count] of counts) {
    if (dateIso >= from30 && dateIso <= today) last30Days += count;
  }

  return {
    last7Days,
    last30Days,
    week,
    maxDaily: week.reduce((max, day) => Math.max(max, day.count), 0),
  };
}

/* --------------------------------- summary -------------------------------- */

export type CourseAnalytics = {
  course: AnalyticsCourse;
  tuton: TutonMetrics;
  assignments: DeadlineMetrics;
  discussions: DeadlineMetrics;
  topics: TopicMetrics;
  questionCount: number;
  quiz: QuizMetrics;
  academic: AcademicMetrics;
};

export type OverallAnalytics = {
  courseCount: number;
  tuton: TutonMetrics;
  assignments: DeadlineMetrics;
  discussions: DeadlineMetrics;
  topics: TopicMetrics;
  questionCount: number;
  quiz: QuizMetrics;
};

export type AnalyticsSummary = {
  overall: OverallAnalytics;
  perCourse: CourseAnalytics[];
  activity: ActivitySummary;
  /** Deterministic observations; every sentence traces back to a metric. */
  insights: string[];
};

/** Builds every metric from one already-loaded, RLS-scoped dataset. */
export function buildAnalytics(inputs: AnalyticsInputs): AnalyticsSummary {
  const { today } = inputs;

  // Grouping happens in memory from the single loaded dataset: no query per
  // course and no N+1 pattern.
  const perCourse: CourseAnalytics[] = inputs.courses.map((course) => {
    const assignments = inputs.assignments.filter(
      (item) => item.course_id === course.id
    );
    const discussions = inputs.discussions.filter(
      (item) => item.course_id === course.id
    );

    return {
      course,
      tuton: tutonMetrics(
        inputs.sessions.filter((session) => session.course_id === course.id),
        today
      ),
      assignments: deadlineMetrics(assignments, today),
      discussions: deadlineMetrics(discussions, today),
      topics: topicMetrics(
        inputs.topics.filter((topic) => topic.course_id === course.id)
      ),
      questionCount: inputs.questions.filter(
        (question) => question.course_id === course.id
      ).length,
      quiz: quizMetrics(
        inputs.attempts.filter((attempt) => attempt.course_id === course.id)
      ),
      academic: academicMetrics(course, assignments, discussions),
    };
  });

  const overall: OverallAnalytics = {
    courseCount: inputs.courses.length,
    tuton: tutonMetrics(inputs.sessions, today),
    assignments: deadlineMetrics(inputs.assignments, today),
    discussions: deadlineMetrics(inputs.discussions, today),
    topics: topicMetrics(inputs.topics),
    questionCount: inputs.questions.length,
    quiz: quizMetrics(inputs.attempts),
  };

  // Recorded activity uses only existing timestamps. Quiz attempts have no
  // created_at, so they use started_at plus completed_at when it exists.
  const records: ActivityRecord[] = [
    ...inputs.materials,
    ...inputs.notes,
    ...inputs.assignments,
    ...inputs.discussions,
    ...inputs.topics,
  ].map((row) => ({ timestamps: [row.created_at, row.updated_at] }));
  for (const attempt of inputs.attempts) {
    records.push({ timestamps: [attempt.started_at, attempt.completed_at] });
  }

  const activity = activitySummary(records, today);

  return {
    overall,
    perCourse,
    activity,
    insights: buildInsights(overall, perCourse, activity),
  };
}

/* --------------------------------- insights ------------------------------- */

function plural(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function activityCount(count: number): string {
  return `${count} recorded ${count === 1 ? "activity" : "activities"}`;
}

/** Percent label used in insights and the UI: percentages need data. */
export function percentLabel(value: number | null): string {
  return value === null ? "No data" : `${formatScore(value)}%`;
}

/**
 * Deterministic observations. Every sentence is a direct restatement of a
 * metric above — no prediction, no recommendation and no judgement.
 */
function buildInsights(
  overall: OverallAnalytics,
  perCourse: CourseAnalytics[],
  activity: ActivitySummary
): string[] {
  const insights: string[] = [];

  insights.push(`${plural(overall.courseCount, "course")} in this workspace.`);

  if (overall.tuton.total === 0) {
    insights.push("No Tuton sessions recorded yet.");
  } else {
    insights.push(
      `${overall.tuton.completed} of ${overall.tuton.total} Tuton sessions are completed (${percentLabel(overall.tuton.percent)}).`
    );
    if (overall.tuton.active > 0) {
      insights.push(
        `${plural(overall.tuton.active, "Tuton session")} currently inside their date range and not completed.`
      );
    }
    if (overall.tuton.overdue > 0) {
      insights.push(
        `${plural(overall.tuton.overdue, "Tuton session")} already past the end date and still not completed (derived from dates; the stored status is unchanged).`
      );
    }
  }

  if (overall.assignments.total === 0) {
    insights.push("No assignments recorded yet.");
  } else {
    insights.push(
      `${overall.assignments.completed} of ${overall.assignments.total} assignments are completed (${percentLabel(overall.assignments.percent)}).`
    );
    if (overall.assignments.overdue > 0) {
      insights.push(
        `${plural(overall.assignments.overdue, "assignment")} past the deadline and still not completed.`
      );
    }
  }

  if (overall.discussions.total === 0) {
    insights.push("No discussions recorded yet.");
  } else {
    insights.push(
      `${overall.discussions.completed} of ${overall.discussions.total} discussions are completed (${percentLabel(overall.discussions.percent)}).`
    );
    if (overall.discussions.overdue > 0) {
      insights.push(
        `${plural(overall.discussions.overdue, "discussion")} past the deadline and still not completed.`
      );
    }
  }

  if (overall.topics.total === 0) {
    insights.push("No exam preparation topics recorded yet.");
  } else {
    insights.push(
      `${overall.topics.completed} of ${overall.topics.total} exam topics are completed (${percentLabel(overall.topics.percent)}).`
    );
  }

  insights.push(
    `Question bank contains ${plural(overall.questionCount, "question")}.`
  );

  if (overall.quiz.completedAttempts === 0) {
    insights.push(
      overall.quiz.attempts > 0
        ? `${plural(overall.quiz.attempts, "quiz attempt")} still in progress; no completed attempt yet, so no quiz score is reported.`
        : "No quiz attempts recorded yet."
    );
  } else {
    insights.push(
      `Average quiz score across ${plural(overall.quiz.completedAttempts, "completed attempt")}: ${percentLabel(overall.quiz.averageScore)}.`
    );
    insights.push(`Best quiz score: ${percentLabel(overall.quiz.bestScore)}.`);
    if (overall.quiz.attempts > overall.quiz.completedAttempts) {
      insights.push(
        `${plural(overall.quiz.attempts - overall.quiz.completedAttempts, "quiz attempt")} still in progress and excluded from the quiz scores.`
      );
    }
  }

  if (perCourse.length > 0) {
    const withFinal = perCourse.filter(
      (course) => course.academic.finalScore !== null
    ).length;
    insights.push(
      `${withFinal} of ${perCourse.length} courses have both a Tuton and a UAS score recorded (existing Phase 7 calculation).`
    );
  }

  insights.push(
    activity.last7Days > 0 || activity.last30Days > 0
      ? `${activityCount(activity.last7Days)} in the last 7 days and ${activityCount(activity.last30Days)} in the last 30 days.`
      : "No recorded activity in the last 30 days."
  );

  return insights;
}