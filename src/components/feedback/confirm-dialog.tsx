"use client";

import { LoaderCircle } from "lucide-react";
import { useState, type ReactNode } from "react";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { describeApiError } from "@/lib/api/errors";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `destructive` for delete / revoke / remove actions. */
  tone?: "default" | "destructive";
  /** May return a promise: the dialog stays open (with a spinner) until it settles, and shows the error if it fails. */
  onConfirm: () => unknown | Promise<unknown>;
  /** Screen-specific wording for a failure (e.g. a 409 business rule); falls back to the generic mapping. */
  describeError?: (error: unknown) => string | undefined;
}

/** Confirmation for irreversible or impactful actions (US-FE-04 AC3). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
  describeError,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (pending) return; // don't close mid-request
    if (!next) setError(null);
    onOpenChange(next);
  };

  const confirm = async () => {
    setPending(true);
    setError(null);
    try {
      await onConfirm();
      setPending(false);
      onOpenChange(false);
    } catch (e) {
      const custom = describeError?.(e);
      const ui = describeApiError(e);
      setError(custom ?? `${ui.title}. ${ui.message}`);
      setPending(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-danger-subtle px-3 py-2 text-body-sm text-danger">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" disabled={pending} />}>{cancelLabel}</AlertDialogClose>
          <Button variant={tone === "destructive" ? "destructive" : "default"} onClick={confirm} disabled={pending}>
            {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
