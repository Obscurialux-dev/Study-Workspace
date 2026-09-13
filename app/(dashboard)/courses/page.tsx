import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/ui/error-state";
import { createClient } from "@/lib/supabase/server";

import { CoursesClient } from "./courses-client";

// Reads the auth session and RLS-scoped data; render per request.
export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: courses, error } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <>
      <PageHeader
        title="Courses"
        description="Your courses for the current semester."
      />
      {error ? (
        <ErrorState
          title="Could not load your courses"
          message="An error occurred while loading your courses. Please try again."
        />
      ) : (
        <CoursesClient courses={courses ?? []} />
      )}
    </>
  );
}
