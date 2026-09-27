import { ApiError, NetworkError } from "@/lib/api/client";

import { ACCEPTED_FORMATS_LABEL, MAX_UPLOAD_BYTES, formatBytes } from "./file-rules";

export interface UploadFailure {
  message: string;
  /** Whether sending the same file again can help (503 / network / 5xx). */
  retryable: boolean;
  traceId?: string;
}

/**
 * US-FE-08 AC4: a specific message per upload error. Server `detail` is shown only for 409
 * (proposal status), as text. 422 = malware: recorded as REJECTED, never retried.
 */
export function describeUploadError(error: unknown): UploadFailure {
  if (error instanceof NetworkError) {
    return { message: "Couldn't reach the server. Check your connection and retry.", retryable: true };
  }
  if (!(error instanceof ApiError)) return { message: "The upload failed. Try again.", retryable: true };

  const { status, traceId } = error;
  const detail = typeof error.problem?.detail === "string" ? error.problem.detail : undefined;
  switch (status) {
    case 400:
      return { message: "The file was not accepted (it may be empty or invalid).", retryable: false, traceId };
    case 403:
    case 404:
      return { message: "Proposal not found, or you don't have access to it.", retryable: false, traceId };
    case 409:
      return {
        message: detail ?? "This proposal doesn't accept new documents in its current status.",
        retryable: false,
        traceId,
      };
    case 413:
      return { message: `The file is larger than ${formatBytes(MAX_UPLOAD_BYTES)}.`, retryable: false, traceId };
    case 415:
      return {
        message: `Unsupported file type. The content must be ${ACCEPTED_FORMATS_LABEL}.`,
        retryable: false,
        traceId,
      };
    case 422:
      return {
        message: "Malware detected. The file was rejected and not stored.",
        retryable: false,
        traceId,
      };
    case 429:
      return { message: "Too many uploads right now. Wait a moment and retry.", retryable: true, traceId };
    case 503:
      return {
        message: "The document service is temporarily unavailable. Nothing was stored. Retry shortly.",
        retryable: true,
        traceId,
      };
    default:
      return status >= 500
        ? { message: "Something went wrong on our side. Retry.", retryable: true, traceId }
        : { message: "The upload failed.", retryable: false, traceId };
  }
}
