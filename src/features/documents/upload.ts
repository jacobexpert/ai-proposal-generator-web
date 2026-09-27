import {
  ApiError,
  BFF_API_PREFIX,
  NetworkError,
  isObject,
  parseRetryAfter,
  type ProblemDetail,
} from "@/lib/api/client";

import type { DocumentCategory, DocumentItem } from "./types";

export interface UploadDocumentParams {
  workspaceId: string;
  proposalId: string;
  category: DocumentCategory;
  file: File;
  /** Fraction of the request body sent so far (0–1). */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/**
 * `POST /api/proposals/{proposalId}/documents` through the BFF (US-BE-07).
 *
 * Uses XMLHttpRequest because `fetch` cannot report upload progress (US-FE-08 AC4). Errors are
 * the same `ApiError` / `NetworkError` as the rest of the app; cancelling rejects with an
 * `AbortError` DOMException. `category` goes in the query string, as declared in the OpenAPI
 * (Spring also accepts it as a multipart field).
 */
export function uploadDocument({
  workspaceId,
  proposalId,
  category,
  file,
  onProgress,
  signal,
}: UploadDocumentParams): Promise<DocumentItem> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Upload cancelled", "AbortError"));
      return;
    }

    const xhr = new XMLHttpRequest();
    const url = `${BFF_API_PREFIX}/api/proposals/${encodeURIComponent(proposalId)}/documents?category=${encodeURIComponent(category)}`;
    xhr.open("POST", url);
    xhr.setRequestHeader("Accept", "application/json, application/problem+json");
    xhr.setRequestHeader("X-Workspace-Id", workspaceId);

    const onAbort = () => xhr.abort();
    signal?.addEventListener("abort", onAbort, { once: true });
    const cleanup = () => signal?.removeEventListener("abort", onAbort);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress?.(Math.min(1, event.loaded / event.total));
    };
    xhr.onload = () => {
      cleanup();
      const body = parseJson(xhr.responseText, xhr.getResponseHeader("Content-Type"));
      if (xhr.status >= 200 && xhr.status < 300 && isObject(body)) {
        onProgress?.(1);
        resolve(body as DocumentItem);
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        reject(new ApiError(502, { title: "Bad Gateway", detail: "Unexpected response from the server." }));
        return;
      }
      reject(
        new ApiError(
          xhr.status,
          isObject(body) ? (body as ProblemDetail) : null,
          parseRetryAfter(xhr.getResponseHeader("Retry-After")),
        ),
      );
    };
    xhr.onerror = () => {
      cleanup();
      reject(new NetworkError(new Error("Upload failed")));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new DOMException("Upload cancelled", "AbortError"));
    };

    const form = new FormData();
    form.append("file", file, file.name);
    xhr.send(form);
  });
}

function parseJson(text: string, contentType: string | null): unknown {
  if (!text || !contentType?.includes("json")) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
