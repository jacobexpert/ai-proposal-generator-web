"use client";

import { AlertTriangle, RefreshCw, SearchX, WifiOff } from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { describeApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

/**
 * App UI › States: what failed, a Retry, and the trace id. 403 and 404 share one message
 * ("Not found or you don't have access") so the UI never reveals whether something exists.
 */
export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  const ui = describeApiError(error);
  const Icon = ui.kind === "not-found" ? SearchX : ui.kind === "network" ? WifiOff : AlertTriangle;
  const tone = ui.kind === "not-found" ? "bg-muted text-muted-foreground" : "bg-danger-subtle text-danger";

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center",
        className,
      )}
    >
      <span className={cn("flex size-10 items-center justify-center rounded-lg", tone)}>
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <div>
        <p className="text-panel-title font-semibold text-foreground">{ui.title}</p>
        <p className="mt-1 max-w-md text-body-sm text-muted-foreground">{ui.message}</p>
        {ui.traceId && <p className="mt-2 font-mono text-mono-sm text-muted-foreground">Trace ID: {ui.traceId}</p>}
      </div>
      {ui.kind === "not-found" ? (
        <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Go to dashboard
        </Link>
      ) : (
        onRetry &&
        ui.retryable && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw />
            Try again
          </Button>
        )
      )}
    </div>
  );
}
