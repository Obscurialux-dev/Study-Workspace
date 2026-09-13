import type { ReactNode } from "react";

export function ErrorState({
  title = "Something went wrong",
  message,
  action,
}: {
  title?: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 px-6 py-12 text-center"
    >
      <h2 className="text-sm font-semibold text-red-800">{title}</h2>
      {message ? (
        <p className="mt-1 max-w-sm text-sm text-red-600">{message}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
