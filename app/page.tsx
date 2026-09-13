import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

// The landing page reads the auth session (cookies); render it per request.
export const dynamic = "force-dynamic";

const primaryButton =
  "inline-flex h-11 items-center justify-center rounded-md bg-slate-900 px-5 text-sm font-medium text-white transition-colors hover:bg-slate-700";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex flex-1 items-center justify-center bg-slate-50 px-6">
      <div className="flex max-w-md flex-col items-center text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Study Workspace
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Personal academic workspace for your courses, Tuton sessions,
          materials, notes, and exam preparation.
        </p>
        <div className="mt-8">
          {user ? (
            <Link href="/dashboard" className={primaryButton}>
              Go to dashboard
            </Link>
          ) : (
            <Link href="/login" className={primaryButton}>
              Sign in
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
