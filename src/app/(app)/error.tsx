"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Error boundary for every screen inside the app shell (US-FE-04 AC4): the shell stays usable,
 * only the page area shows the failure. The error message itself is not rendered (it may
 * contain internals); the digest lets support correlate with server logs.
 */
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-16 text-center"
    >
      <span className="flex size-10 items-center justify-center rounded-lg bg-danger-subtle text-danger">
        <AlertTriangle aria-hidden="true" className="size-5" />
      </span>
      <div>
        <p className="text-panel-title font-semibold text-foreground">This page couldn&apos;t be displayed</p>
        <p className="mt-1 text-body-sm text-muted-foreground">Something went wrong on our side. Try again.</p>
        {error.digest && <p className="mt-2 font-mono text-mono-sm text-muted-foreground">Reference: {error.digest}</p>}
      </div>
      <Button variant="outline" size="sm" onClick={() => retry()}>
        <RefreshCw />
        Try again
      </Button>
    </div>
  );
}
