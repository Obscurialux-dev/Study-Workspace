import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Use the email and password of your Study Workspace account.
          </p>
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-700 hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}
