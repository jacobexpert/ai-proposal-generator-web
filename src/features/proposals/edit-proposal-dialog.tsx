"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { notifySuccess } from "@/components/feedback/notify";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api/client";
import { applyFieldErrors, describeApiError } from "@/lib/api/errors";

import { updateProposal, type Proposal } from "./api";
import {
  formFromProposal,
  PROPOSAL_FIELDS,
  ProposalFormFields,
  proposalFormSchema,
  toUpdateRequest,
  type ProposalFormValues,
} from "./proposal-form";
import { proposalKey, proposalsKey, useTemplates } from "./queries";

export const CONCURRENT_EDIT_MESSAGE = "Someone else changed this proposal while you were editing.";

/** US-FE-07 AC3: edit the metadata; the `version` guards against overwriting someone else's change (409). */
export function EditProposalDialog({
  workspaceId,
  proposal,
  open,
  onOpenChange,
}: {
  workspaceId: string;
  proposal: Proposal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-4rem)] max-w-2xl overflow-y-auto">
        {/* Keyed by version: reopening after a reload starts from the latest data. */}
        <EditForm
          key={proposal.version}
          workspaceId={workspaceId}
          proposal={proposal}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function EditForm({ workspaceId, proposal, onDone }: { workspaceId: string; proposal: Proposal; onDone: () => void }) {
  const queryClient = useQueryClient();
  const templates = useTemplates(workspaceId);
  const before = formFromProposal(proposal);
  const [formError, setFormError] = useState<{ message: string; traceId?: string; conflict?: boolean } | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalFormSchema(before.deadline)),
    defaultValues: before,
  });
  const approved = proposal.status === "APPROVED" || proposal.status === "EXPORTED";

  const save = useMutation({
    mutationFn: (body: NonNullable<ReturnType<typeof toUpdateRequest>>) =>
      updateProposal(workspaceId, proposal.id, { ...body, version: proposal.version }),
    meta: { errorToast: false },
    onSuccess: (updated) => {
      queryClient.setQueryData(proposalKey(workspaceId, proposal.id), updated);
      void queryClient.invalidateQueries({ queryKey: proposalsKey(workspaceId) });
      notifySuccess("Proposal details saved.");
      onDone();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        setFormError({ message: CONCURRENT_EDIT_MESSAGE, conflict: true });
        return;
      }
      const unmatched = applyFieldErrors(error, PROPOSAL_FIELDS, setError);
      const ui = describeApiError(error);
      if (ui.kind === "validation" && unmatched.length === 0) return;
      setFormError({ message: unmatched.join(" ") || `${ui.title}. ${ui.message}`, traceId: ui.traceId });
    },
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => {
        setFormError(null);
        const body = toUpdateRequest(values, before);
        if (!body) return onDone();
        save.mutate(body);
      })}
    >
      <DialogTitle>Edit proposal details</DialogTitle>
      <DialogDescription>Customer, opportunity and the people involved.</DialogDescription>

      <div className="mt-5 flex flex-col gap-5">
        {approved && (
          <Alert tone="warning">
            <AlertTriangle aria-hidden="true" />
            <p>This proposal is approved. Saving changes moves it back to review, and it needs approval again.</p>
          </Alert>
        )}
        {formError && (
          <Alert tone="danger">
            <AlertCircle aria-hidden="true" />
            <div>
              <p>{formError.message}</p>
              {formError.conflict && (
                <button
                  type="button"
                  className="mt-1 font-medium underline underline-offset-2"
                  onClick={() =>
                    void queryClient.invalidateQueries({ queryKey: proposalKey(workspaceId, proposal.id) })
                  }
                >
                  Load the latest version
                </button>
              )}
              {formError.traceId && (
                <p className="mt-1 font-mono text-mono-sm opacity-80">Trace ID: {formError.traceId}</p>
              )}
            </div>
          </Alert>
        )}
        <ProposalFormFields
          register={register}
          errors={errors}
          templates={templates.data ?? []}
          currentLanguage={proposal.language}
          currentCurrency={proposal.currency.toUpperCase()}
        />
      </div>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" disabled={save.isPending} />}>Cancel</DialogClose>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
          Save changes
        </Button>
      </DialogFooter>
    </form>
  );
}
