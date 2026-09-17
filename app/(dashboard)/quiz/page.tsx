import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";

// Static navigation page: no data is read, so nothing to render per request.
const SECTIONS = [
  {
    href: "/quiz/questions",
    title: "Question Bank",
    description:
      "Write and manage your own multiple-choice questions. Optionally link a question to an exam topic or a material.",
  },
  {
    href: "/quiz/practice",
    title: "Practice Quiz",
    description:
      "Start a practice quiz from your question bank, answer every question, and review your answers before submitting.",
  },
  {
    href: "/quiz/attempts",
    title: "Quiz History",
    description:
      "Open a past attempt to see the score, the correct answers and the explanation for each question.",
  },
];

export default function QuizPage() {
  return (
    <>
      <PageHeader
        title="Quiz & Practice"
        description="Practice with questions you author yourself. Quiz scores are practice only and never change your academic grades."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <h2 className="text-sm font-semibold text-slate-900">
              {section.title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {section.description}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          How questions get here
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Questions are written manually. Read your material, module, notes,
          assignment, or discussion yourself, then enter the question into the
          question bank. The application stores and runs the questions; it does
          not read, parse or generate anything from your files.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Materials are source references only — a question can point to an
          existing material, but its file is never processed here.
        </p>
      </div>
    </>
  );
}