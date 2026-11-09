"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[APP_ERROR_BOUNDARY]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-rose-50/30 px-4 py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-5">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-700">
        Something went wrong
      </p>
      <h1 className="mt-3 text-2xl sm:text-3xl font-serif font-bold text-neutral-900">
        We couldn&apos;t load this page
      </h1>
      <p className="mt-3 max-w-md text-sm text-neutral-600">
        An unexpected error occurred. Your cart and any submitted order are
        safe. Please retry, or return to the store.
      </p>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-rose-900 text-white text-sm font-medium hover:bg-rose-950"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
        <a
          href="/"
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl border border-neutral-300 bg-white text-neutral-800 text-sm font-medium hover:bg-neutral-50"
        >
          <Home className="w-4 h-4" />
          Back to Home
        </a>
      </div>
    </div>
  );
}
