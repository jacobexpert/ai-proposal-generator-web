"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge, type StatusBadgeProps } from "@/components/ui/status-badge";
import { env } from "@/config/env";
import { ApiError, NetworkError } from "@/lib/api/client";

import { useHealth } from "./use-health";

function toneFor(status: string): StatusBadgeProps["tone"] {
  switch (status.toUpperCase()) {
    case "UP":
      return "success";
    case "DOWN":
    case "OUT_OF_SERVICE":
      return "danger";
    default:
      return "warning";
  }
}

function describeError(error: unknown): { message: string; traceId?: string } {
  if (error instanceof NetworkError) return { message: "The backend could not be reached." };
  if (error instanceof ApiError) {
    // Spring returns 503 with the health body when a component is DOWN.
    return { message: `The backend answered ${error.status}.`, traceId: error.traceId };
  }
  return { message: "The backend returned an unexpected response." };
}

export function SystemHealthPanel() {
  const { data, error, isPending, isFetching, refetch } = useHealth();

  return (
    <section
      aria-labelledby="backend-health-title"
      className="max-w-2xl rounded-xl border border-border bg-card p-6 shadow-md"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 id="backend-health-title" className="text-panel-title font-semibold">
            Backend API
          </h2>
          <p className="mt-0.5 font-mono text-mono-sm text-muted-foreground">{env.NEXT_PUBLIC_API_BASE_URL}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={isFetching ? "animate-spin" : undefined} />
          Refresh
        </Button>
      </div>

      <div aria-live="polite">
        {isPending ? (
          <div className="flex flex-col gap-2" aria-label="Checking backend status">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-4 w-48" />
          </div>
        ) : error ? (
          <ErrorBody {...describeError(error)} />
        ) : (
          <>
            <StatusBadge tone={toneFor(data.status)}>{data.status}</StatusBadge>
            {data.components && Object.keys(data.components).length > 0 && (
              <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
                {Object.entries(data.components).map(([name, component]) => (
                  <li key={name} className="flex h-row items-center justify-between px-4 text-body-sm">
                    <span className="font-mono text-mono-sm">{name}</span>
                    <StatusBadge tone={toneFor(component.status)}>{component.status}</StatusBadge>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function ErrorBody({ message, traceId }: { message: string; traceId?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <StatusBadge tone="danger">Unavailable</StatusBadge>
      <p className="text-body-sm text-foreground">{message}</p>
      {traceId && <p className="font-mono text-mono-sm text-muted-foreground">Trace ID: {traceId}</p>}
    </div>
  );
}
