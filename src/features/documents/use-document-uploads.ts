"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";

import { redirectToLoginOnUnauthorized } from "@/app/providers";
import { ApiError } from "@/lib/api/client";

import { validateFile } from "./file-rules";
import type { DocumentCategory, DocumentItem } from "./types";
import { describeUploadError, type UploadFailure } from "./upload-errors";
import { isAbortError, uploadDocument } from "./upload";

/** Uploads running at the same time; the rest wait in the queue. */
export const MAX_PARALLEL_UPLOADS = 2;

export type UploadStatus =
  | "invalid" // failed the client checks, never sent
  | "ready" // waiting for the user to start
  | "queued"
  | "uploading"
  | "uploaded"
  | "failed"
  | "cancelled";

export interface UploadItem {
  key: string;
  file: File;
  category: DocumentCategory;
  status: UploadStatus;
  /** 0–1 of the bytes sent. */
  progress: number;
  error?: UploadFailure;
  document?: DocumentItem;
}

type Action =
  | { type: "add"; items: UploadItem[] }
  | { type: "category"; key: string; category: DocumentCategory }
  | { type: "queue"; keys: string[] }
  | { type: "start"; key: string }
  | { type: "progress"; key: string; progress: number }
  | { type: "done"; key: string; document: DocumentItem }
  | { type: "fail"; key: string; error: UploadFailure }
  | { type: "cancel"; key: string }
  | { type: "remove"; key: string }
  | { type: "clearFinished" };

const EDITABLE: readonly UploadStatus[] = ["ready", "failed", "cancelled"];

function update(items: UploadItem[], key: string, patch: (item: UploadItem) => UploadItem): UploadItem[] {
  return items.map((item) => (item.key === key ? patch(item) : item));
}

function reducer(items: UploadItem[], action: Action): UploadItem[] {
  switch (action.type) {
    case "add":
      return [...items, ...action.items];
    case "category":
      return update(items, action.key, (i) => (EDITABLE.includes(i.status) ? { ...i, category: action.category } : i));
    case "queue":
      return items.map((i) =>
        action.keys.includes(i.key) &&
        (i.status === "ready" || i.status === "cancelled" || (i.status === "failed" && i.error?.retryable))
          ? { ...i, status: "queued", progress: 0, error: undefined }
          : i,
      );
    case "start":
      return update(items, action.key, (i) => (i.status === "queued" ? { ...i, status: "uploading", progress: 0 } : i));
    case "progress":
      return update(items, action.key, (i) => (i.status === "uploading" ? { ...i, progress: action.progress } : i));
    case "done":
      return update(items, action.key, (i) => ({ ...i, status: "uploaded", progress: 1, document: action.document }));
    case "fail":
      return update(items, action.key, (i) =>
        i.status === "uploading" ? { ...i, status: "failed", error: action.error } : i,
      );
    case "cancel":
      return update(items, action.key, (i) =>
        i.status === "queued" || i.status === "uploading" ? { ...i, status: "cancelled", progress: 0 } : i,
      );
    case "remove":
      return items.filter((i) => i.key !== action.key || i.status === "uploading" || i.status === "queued");
    case "clearFinished":
      return items.filter((i) => i.status !== "uploaded");
  }
}

let sequence = 0;
const nextKey = () => `upload-${Date.now().toString(36)}-${(sequence += 1)}`;

export interface UseDocumentUploadsOptions {
  workspaceId: string;
  proposalId: string;
  defaultCategory: DocumentCategory;
  /** A document was stored (201). */
  onUploaded?: (document: DocumentItem) => void;
  /** The proposal's documents changed on the server (201, or 422 which records a REJECTED document). */
  onDocumentsChanged?: () => void;
}

/**
 * Upload queue of the DocumentUploader (US-FE-08): client checks, per-file category, at most
 * MAX_PARALLEL_UPLOADS requests at once, progress, cancel and retry.
 */
export function useDocumentUploads({
  workspaceId,
  proposalId,
  defaultCategory,
  onUploaded,
  onDocumentsChanged,
}: UseDocumentUploadsOptions) {
  const [items, dispatch] = useReducer(reducer, []);
  const controllers = useRef(new Map<string, AbortController>());
  const callbacks = useRef({ onUploaded, onDocumentsChanged });
  useEffect(() => {
    callbacks.current = { onUploaded, onDocumentsChanged };
  });

  // Start queued uploads while there is room.
  useEffect(() => {
    let running = controllers.current.size;
    for (const item of items) {
      if (running >= MAX_PARALLEL_UPLOADS) break;
      if (item.status !== "queued" || controllers.current.has(item.key)) continue;
      running += 1;
      const controller = new AbortController();
      controllers.current.set(item.key, controller);
      dispatch({ type: "start", key: item.key });
      // Free the slot before the state change that re-runs this effect.
      const release = () => {
        if (controllers.current.get(item.key) === controller) controllers.current.delete(item.key);
      };
      uploadDocument({
        workspaceId,
        proposalId,
        category: item.category,
        file: item.file,
        signal: controller.signal,
        onProgress: (progress) => dispatch({ type: "progress", key: item.key, progress }),
      }).then(
        (document) => {
          release();
          dispatch({ type: "done", key: item.key, document });
          callbacks.current.onUploaded?.(document);
          callbacks.current.onDocumentsChanged?.();
        },
        (error: unknown) => {
          release();
          if (isAbortError(error)) return; // cancel() already updated the state
          if (redirectToLoginOnUnauthorized(error)) return;
          dispatch({ type: "fail", key: item.key, error: describeUploadError(error) });
          if (error instanceof ApiError && error.status === 422) callbacks.current.onDocumentsChanged?.();
        },
      );
    }
  }, [items, workspaceId, proposalId]);

  // Leaving the screen cancels what is still in flight.
  useEffect(() => {
    const inFlight = controllers.current;
    return () => {
      for (const controller of inFlight.values()) controller.abort();
      inFlight.clear();
    };
  }, []);

  const addFiles = useCallback(
    (files: Iterable<File>) => {
      const added = Array.from(files, (file): UploadItem => {
        const problem = validateFile(file);
        return {
          key: nextKey(),
          file,
          category: defaultCategory,
          status: problem ? "invalid" : "ready",
          progress: 0,
          error: problem ? { message: problem, retryable: false } : undefined,
        };
      });
      if (added.length > 0) dispatch({ type: "add", items: added });
    },
    [defaultCategory],
  );

  const setCategory = useCallback(
    (key: string, category: DocumentCategory) => dispatch({ type: "category", key, category }),
    [],
  );

  const uploadAll = useCallback(() => {
    dispatch({ type: "queue", keys: items.filter((i) => i.status === "ready").map((i) => i.key) });
  }, [items]);

  const retry = useCallback((key: string) => dispatch({ type: "queue", keys: [key] }), []);

  const cancel = useCallback((key: string) => {
    const controller = controllers.current.get(key);
    controllers.current.delete(key); // frees the slot for the next queued file
    controller?.abort();
    dispatch({ type: "cancel", key });
  }, []);

  const remove = useCallback((key: string) => dispatch({ type: "remove", key }), []);
  const clearFinished = useCallback(() => dispatch({ type: "clearFinished" }), []);

  return { items, addFiles, setCategory, uploadAll, retry, cancel, remove, clearFinished };
}
