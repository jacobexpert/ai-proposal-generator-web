import { toast } from "sonner";

import { describeApiError } from "@/lib/api/errors";

/** Error toast for any request error (US-FE-04 AC2: 5xx → toast with trace id). */
export function notifyError(error: unknown, fallbackTitle?: string): void {
  const ui = describeApiError(error);
  const description = [ui.message, ui.traceId ? `Trace ID: ${ui.traceId}` : null].filter(Boolean).join(" · ");
  toast.error(fallbackTitle ?? ui.title, { description, id: ui.traceId });
}

export function notifySuccess(title: string, description?: string): void {
  toast.success(title, { description });
}
