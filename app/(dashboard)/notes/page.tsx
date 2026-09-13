import { NotesClient } from "./notes-client";
import { PageHeader } from "@/components/shared/page-header";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { ErrorState } from "@/components/ui/error-state";
import { createClient } from "@/lib/supabase/server";

// Reads the auth session and RLS-scoped data; render per request.
export const dynamic = "force-dynamic";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; course?: string }>;
}) {
  const { q = "", course = "" } = await searchParams;
  const supabase = await createClient();

  const [{ data: courses }, { data: notes, error }] = await Promise.all([
    supabase
      .from("courses")
      .select("id, code, name")
      .order("created_at", { ascending: true }),
    (() => {
      let query = supabase
        .from("notes")
        .select("*, courses(code, name), materials(title)")
        .order("created_at", { ascending: false });
      if (course) {
        query = course === "none"
          ? query.is("course_id", null)
          : query.eq("course_id", course);
      }
      const term = q.replace(/[,()]/g, " ").trim();
      if (term) {
        query = query.or(`title.ilike.%${term}%,content.ilike.%${term}%`);
      }
      return query;
    })(),
  ]);

  return (
    <>
      <PageHeader
        title="Notes"
        description="Global and course-specific notes, optionally related to materials."
      />
      <SearchFilterBar
        basePath="/notes"
        q={q}
        qPlaceholder="Search notes..."
        courses={courses ?? []}
        courseId={course}
      />
      {error ? (
        <ErrorState
          title="Could not load your notes"
          message="An error occurred while loading your notes. Please try again."
        />
      ) : (
        <NotesClient notes={notes ?? []} courses={courses ?? []} />
      )}
    </>
  );
}
