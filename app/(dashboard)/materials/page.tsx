import { MaterialsClient } from "./materials-client";
import { PageHeader } from "@/components/shared/page-header";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { ErrorState } from "@/components/ui/error-state";
import { createClient } from "@/lib/supabase/server";

// Reads the auth session and RLS-scoped data; render per request.
export const dynamic = "force-dynamic";

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; course?: string }>;
}) {
  const { q = "", course = "" } = await searchParams;
  const supabase = await createClient();

  const [{ data: courses }, { data: materials, error }] = await Promise.all([
    supabase
      .from("courses")
      .select("id, code, name")
      .order("created_at", { ascending: true }),
    (() => {
      let query = supabase
        .from("materials")
        .select("*, courses(code, name), tuton_sessions(session_number)")
        .order("created_at", { ascending: false });
      if (course) query = query.eq("course_id", course);
      const term = q.replace(/[,()]/g, " ").trim();
      if (term) {
        query = query.or(
          `title.ilike.%${term}%,module_name.ilike.%${term}%,topic.ilike.%${term}%,content.ilike.%${term}%`
        );
      }
      return query;
    })(),
  ]);

  return (
    <>
      <PageHeader
        title="Materials"
        description="Course materials saved as text or files, across all courses."
      />
      <SearchFilterBar
        basePath="/materials"
        q={q}
        qPlaceholder="Search title, module, topic, content..."
        courses={courses ?? []}
        courseId={course}
      />
      {error ? (
        <ErrorState
          title="Could not load your materials"
          message="An error occurred while loading your materials. Please try again."
        />
      ) : (
        <MaterialsClient materials={materials ?? []} courses={courses ?? []} />
      )}
    </>
  );
}
