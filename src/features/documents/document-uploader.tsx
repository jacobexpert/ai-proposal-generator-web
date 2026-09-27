"use client";

import { CheckCircle2, FileText, RotateCcw, Upload, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type DragEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

import { CATEGORY_LABEL, COMPANY_CATEGORIES, CUSTOMER_CATEGORIES, DOCUMENT_CATEGORIES } from "./categories";
import { ACCEPT_ATTRIBUTE, ACCEPTED_FORMATS_LABEL, MAX_UPLOAD_BYTES, formatBytes } from "./file-rules";
import type { DocumentCategory, DocumentItem } from "./types";
import { useDocumentUploads, type UploadItem, type UploadStatus } from "./use-document-uploads";

export interface DocumentUploaderProps {
  workspaceId: string;
  proposalId: string;
  /** `RFP` on the Documents step, `COMPANY_PROFILE` on the Company Knowledge step (US-FE-08 AC3). */
  defaultCategory?: DocumentCategory;
  onUploaded?: (document: DocumentItem) => void;
  /** Refresh document lists: called after a 201 or a 422 (the API records the rejected file). */
  onDocumentsChanged?: () => void;
  /**
   * Files still in the queue: `active` = waiting or uploading, `ready` = chosen but not sent yet.
   * Hosts that can unmount the uploader (e.g. the Create Proposal wizard) use it to avoid
   * cancelling uploads or dropping chosen files.
   */
  onQueueChange?: (queue: UploadQueueSummary) => void;
  className?: string;
}

export interface UploadQueueSummary {
  active: number;
  ready: number;
}

const CATEGORY_ITEMS = DOCUMENT_CATEGORIES.map((value) => ({ value, label: CATEGORY_LABEL[value] }));

const STATUS_BADGE: Record<
  UploadStatus,
  { label: string; tone: "neutral" | "info" | "success" | "warning" | "danger" }
> = {
  invalid: { label: "Not allowed", tone: "danger" },
  ready: { label: "Ready", tone: "neutral" },
  queued: { label: "Waiting", tone: "neutral" },
  uploading: { label: "Uploading", tone: "info" },
  uploaded: { label: "Uploaded", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "warning" },
};

/**
 * Drag & drop multi-file upload with a category per file (US-FE-08). Reused by the proposal
 * Documents tab and the Create Proposal wizard (US-FE-06 steps 2/3). File names are rendered as
 * text only.
 */
export function DocumentUploader({
  workspaceId,
  proposalId,
  defaultCategory = "RFP",
  onUploaded,
  onDocumentsChanged,
  onQueueChange,
  className,
}: DocumentUploaderProps) {
  const uploads = useDocumentUploads({ workspaceId, proposalId, defaultCategory, onUploaded, onDocumentsChanged });
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const hintId = useId();

  const readyCount = uploads.items.filter((i) => i.status === "ready").length;
  const uploadedCount = uploads.items.filter((i) => i.status === "uploaded").length;
  const activeCount = uploads.items.filter((i) => i.status === "uploading" || i.status === "queued").length;

  const queueListener = useRef(onQueueChange);
  useEffect(() => {
    queueListener.current = onQueueChange;
  });
  useEffect(() => {
    queueListener.current?.({ active: activeCount, ready: readyCount });
  }, [activeCount, readyCount]);

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    uploads.addFiles(event.dataTransfer.files);
  };

  return (
    <section aria-label="Upload documents" className={cn("flex flex-col gap-4", className)}>
      <div
        data-testid="document-dropzone"
        data-dragging={dragging || undefined}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center transition-colors duration-200",
          dragging && "border-brand bg-brand-subtle",
        )}
      >
        <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Upload aria-hidden="true" className="size-5" />
        </span>
        <div>
          <p className="text-panel-title font-semibold text-foreground">Drag and drop files here</p>
          <p id={hintId} className="mt-1 text-body-sm text-muted-foreground">
            {ACCEPTED_FORMATS_LABEL}, up to {formatBytes(MAX_UPLOAD_BYTES)} each
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} aria-describedby={hintId}>
          Choose files
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          data-testid="document-file-input"
          onChange={(e) => {
            if (e.target.files) uploads.addFiles(e.target.files);
            e.target.value = ""; // allow picking the same file again
          }}
        />
      </div>

      {uploads.items.length > 0 && (
        <>
          <ul
            aria-label="Files to upload"
            className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card"
          >
            {uploads.items.map((item) => (
              <UploadRow
                key={item.key}
                item={item}
                onCategoryChange={(category) => uploads.setCategory(item.key, category)}
                onCancel={() => uploads.cancel(item.key)}
                onRetry={() => uploads.retry(item.key)}
                onRemove={() => uploads.remove(item.key)}
              />
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {uploadedCount > 0 && (
              <Button variant="ghost" size="sm" onClick={uploads.clearFinished}>
                Clear uploaded
              </Button>
            )}
            <Button onClick={uploads.uploadAll} disabled={readyCount === 0}>
              <Upload aria-hidden="true" />
              {readyCount > 1 ? `Upload ${readyCount} files` : "Upload"}
            </Button>
          </div>
        </>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {activeCount > 0
          ? `Uploading ${activeCount} file${activeCount === 1 ? "" : "s"}`
          : uploadedCount > 0
            ? `${uploadedCount} file${uploadedCount === 1 ? "" : "s"} uploaded`
            : ""}
      </p>
    </section>
  );
}

function UploadRow({
  item,
  onCategoryChange,
  onCancel,
  onRetry,
  onRemove,
}: {
  item: UploadItem;
  onCategoryChange: (category: DocumentCategory) => void;
  onCancel: () => void;
  onRetry: () => void;
  onRemove: () => void;
}) {
  const { file, status } = item;
  const badge = STATUS_BADGE[status];
  const editable = status === "ready" || status === "failed" || status === "cancelled";
  const sending = status === "uploading";
  const percent = Math.round(item.progress * 100);

  return (
    <li className="flex flex-col gap-2 px-4 py-3" data-testid="upload-row" data-status={status}>
      <div className="flex flex-wrap items-center gap-3">
        <FileText aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          {/* Plain text only: file names are user-controlled (US-FE-08 AC5). */}
          <p className="truncate text-body-sm font-medium text-foreground" title={file.name}>
            {file.name}
          </p>
          <p className="text-caption text-muted-foreground">{formatBytes(file.size)}</p>
        </div>

        {status !== "invalid" && (
          <div className="w-52">
            <Select
              items={CATEGORY_ITEMS}
              value={item.category}
              onValueChange={(value) => value && onCategoryChange(value as DocumentCategory)}
              disabled={!editable}
            >
              <SelectTrigger size="sm" aria-label={`Category for ${file.name}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Customer</SelectLabel>
                  {CUSTOMER_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Company knowledge</SelectLabel>
                  {COMPANY_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectSeparator />
                <SelectItem value="OTHER">{CATEGORY_LABEL.OTHER}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <StatusBadge tone={badge.tone} pulse={sending}>
          {status === "uploading" ? (percent >= 100 ? "Checking" : `${percent}%`) : badge.label}
        </StatusBadge>
        {status === "uploaded" && <CheckCircle2 aria-hidden="true" className="size-4 text-success" />}

        <div className="flex items-center gap-1">
          {(status === "uploading" || status === "queued") && (
            <Button variant="ghost" size="sm" onClick={onCancel} aria-label={`Cancel upload of ${file.name}`}>
              Cancel
            </Button>
          )}
          {(status === "cancelled" || (status === "failed" && item.error?.retryable)) && (
            <Button variant="outline" size="sm" onClick={onRetry} aria-label={`Retry upload of ${file.name}`}>
              <RotateCcw aria-hidden="true" />
              Retry
            </Button>
          )}
          {status !== "uploading" && status !== "queued" && (
            <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label={`Remove ${file.name}`}>
              <X aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      {sending && (
        <div
          role="progressbar"
          aria-label={`Uploading ${file.name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-200"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
      {item.error && (status === "invalid" || status === "failed") && (
        <p className="text-body-sm text-danger">
          {item.error.message}
          {item.error.traceId && (
            <span className="ml-2 font-mono text-mono-sm text-muted-foreground">Trace ID: {item.error.traceId}</span>
          )}
        </p>
      )}
    </li>
  );
}
