import { ApiError, NetworkError } from "./client";

/** How a screen should react to a failed request (US-FE-04 AC2). */
export type ApiErrorKind =
  | "validation" // 400 → show field errors on the form
  | "unauthorized" // 401 → session over, go to /login (handled globally)
  | "not-found" // 403 / 404 → "Not found or you don't have access" (never reveal which)
  | "conflict" // 409 → state changed / not allowed in this state
  | "rejected" // 413 / 415 / 422 → the request content was refused
  | "rate-limited" // 429
  | "server" // 5xx → toast with trace id
  | "network" // API unreachable
  | "unknown";

export interface UiError {
  kind: ApiErrorKind;
  title: string;
  message: string;
  status?: number;
  traceId?: string;
  fieldErrors: Record<string, string>;
  retryAfterSeconds?: number;
  /** Whether trying the same request again can help. */
  retryable: boolean;
}

const NOT_FOUND_MESSAGE = "It may have been removed, or you don't have access to it.";

function minutes(seconds: number): string {
  const m = Math.max(1, Math.ceil(seconds / 60));
  return `${m} minute${m === 1 ? "" : "s"}`;
}

/**
 * Single mapping from any request error to user-facing copy. Server-provided `detail` is only
 * used for 409/413/415/422, where the API writes it for end users; it is rendered as text.
 */
export function describeApiError(error: unknown): UiError {
  const base = { fieldErrors: {}, retryable: false } satisfies Partial<UiError>;

  if (error instanceof NetworkError) {
    return {
      ...base,
      kind: "network",
      title: "Can't reach the server",
      message: "Check your connection and try again.",
      retryable: true,
    };
  }
  if (!(error instanceof ApiError)) {
    return { ...base, kind: "unknown", title: "Something went wrong", message: "Try again.", retryable: true };
  }

  const { status, traceId, retryAfterSeconds } = error;
  const detail = typeof error.problem?.detail === "string" ? error.problem.detail : undefined;
  const common = { ...base, status, traceId, retryAfterSeconds };

  if (status === 400) {
    return {
      ...common,
      kind: "validation",
      title: "Check the highlighted fields",
      message: "Some values are missing or invalid.",
      fieldErrors: error.fieldErrors,
    };
  }
  if (status === 401) {
    return { ...common, kind: "unauthorized", title: "Your session has ended", message: "Sign in again to continue." };
  }
  if (status === 403 || status === 404) {
    return { ...common, kind: "not-found", title: "Not found or you don't have access", message: NOT_FOUND_MESSAGE };
  }
  if (status === 409) {
    return {
      ...common,
      kind: "conflict",
      title: "This couldn't be done right now",
      message:
        detail ?? "It was changed by someone else or is in a state that doesn't allow this. Refresh and try again.",
    };
  }
  if (status === 413 || status === 415 || status === 422) {
    return {
      ...common,
      kind: "rejected",
      title: "This was not accepted",
      message: detail ?? "The content was rejected.",
    };
  }
  if (status === 429) {
    return {
      ...common,
      kind: "rate-limited",
      title: "Too many attempts",
      message: retryAfterSeconds ? `Try again in ${minutes(retryAfterSeconds)}.` : "Wait a moment and try again.",
      retryable: true,
    };
  }
  if (status >= 500) {
    return {
      ...common,
      kind: "server",
      title: "Something went wrong on our side",
      message: status === 503 ? "The service is temporarily unavailable. Try again shortly." : "Try again.",
      retryable: true,
    };
  }
  return { ...common, kind: "unknown", title: "Something went wrong", message: "Try again.", retryable: true };
}

/**
 * Bind server field errors (400) to form fields (react-hook-form `setError`). Field names from
 * the API match the request DTO, which is also the form model. Returns the messages that
 * could not be attached to a known field so the caller can show them in a form-level alert.
 */
export function applyFieldErrors<Field extends string>(
  error: unknown,
  fields: readonly Field[],
  setError: (field: Field, error: { type: string; message: string }) => void,
): string[] {
  if (!(error instanceof ApiError) || error.status !== 400) return [];
  const unmatched: string[] = [];
  for (const [field, message] of Object.entries(error.fieldErrors)) {
    if ((fields as readonly string[]).includes(field)) setError(field as Field, { type: "server", message });
    else unmatched.push(message);
  }
  return unmatched;
}
