"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, LoaderCircle, MoreHorizontal, Pencil, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { notifySuccess } from "@/components/feedback/notify";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurrentWorkspace, useWorkspaceContext } from "@/features/workspaces";
import { ApiError } from "@/lib/api/client";
import { describeApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

import { deleteProposal, retryProposal, type Proposal } from "./api";
import { EditProposalDialog } from "./edit-proposal-dialog";
import { LifecycleStepper } from "./lifecycle-stepper";
import { proposalKey, proposalsKey, useProposal } from "./queries";
import { isTabAvailable, PROPOSAL_TABS, RUNNING, STATUS_LABEL, STATUS_TONE, tabHref, type ProposalTab } from "./status";

/** US-FE-07: header, lifecycle, tabs and actions around every `/proposals/[id]/*` page. */
export function ProposalShell({ proposalId, children }: { proposalId: string; children: ReactNode }) {
  const workspace = useCurrentWorkspace();
  const { user } = useWorkspaceContext();
  const proposal = useProposal(workspace.id, proposalId);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  if (proposal.isPending) return <LoadingState label="Loading proposal" />;
  if (proposal.isError) return <ErrorState error={proposal.error} onRetry={() => void proposal.refetch()} />;
  const p = proposal.data;

  // D3: delete only a DRAFT, by its creator or a workspace owner (the API enforces it too).
  const canDelete =
    p.status === "DRAFT" &&
    (workspace.role === "OWNER" || (!!user && p.createdBy?.toLowerCase() === user.id.toLowerCase()));

  const remove = async () => {
    try {
      await deleteProposal(workspace.id, p.id);
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) throw error;
    }
    queryClient.removeQueries({ queryKey: proposalKey(workspace.id, p.id) });
    void queryClient.invalidateQueries({ queryKey: proposalsKey(workspace.id) });
    notifySuccess(`“${p.name}” was deleted.`);
    router.push("/proposals");
  };

  return (
    <>
      <PageHeader
        title={p.name}
        description={p.customerName}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Proposals", href: "/proposals" },
          { label: p.name, href: tabHref(p.id, "overview") },
        ]}
        actions={
          <>
            <StatusBadge tone={STATUS_TONE[p.status]} pulse={RUNNING.has(p.status)}>
              {STATUS_LABEL[p.status]}
            </StatusBadge>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil />
              Edit details
            </Button>
            {canDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="More actions" />}>
                  <MoreHorizontal />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                    <Trash2 />
                    Delete draft
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        }
      />

      <div className="mb-6 rounded-xl border border-border bg-card px-5 py-4">
        <LifecycleStepper status={p.status} previousStatus={p.previousStatus} />
        {p.status === "FAILED" && <FailedBanner workspaceId={workspace.id} proposal={p} />}
      </div>

      <ProposalTabs proposal={p} />
      {children}

      <EditProposalDialog workspaceId={workspace.id} proposal={p} open={editOpen} onOpenChange={setEditOpen} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete “${p.name}”?`}
        description="The draft and its details are removed for everyone in this workspace. This can't be undone."
        confirmLabel="Delete draft"
        tone="destructive"
        onConfirm={remove}
        describeError={(e) =>
          e instanceof ApiError && e.status === 409
            ? "Only drafts can be deleted, and this proposal has moved on. Refresh to see its current status."
            : e instanceof ApiError && e.status === 403
              ? "Only the person who created this proposal or a workspace owner can delete it."
              : undefined
        }
      />
    </>
  );
}

/** AC2: `FAILED` shows where it failed and offers Retry (back to the step before the failure). */
function FailedBanner({ workspaceId, proposal }: { workspaceId: string; proposal: Proposal }) {
  const queryClient = useQueryClient();
  const retry = useMutation({
    mutationFn: () => retryProposal(workspaceId, proposal.id),
    meta: { errorToast: false },
    onSuccess: (updated) => {
      queryClient.setQueryData(proposalKey(workspaceId, proposal.id), updated);
      void queryClient.invalidateQueries({ queryKey: proposalsKey(workspaceId) });
      notifySuccess(`Retrying from “${STATUS_LABEL[updated.status]}”.`);
    },
  });
  const ui = retry.isError ? describeApiError(retry.error) : undefined;
  const step = proposal.previousStatus ? STATUS_LABEL[proposal.previousStatus] : "the last step";
  return (
    <Alert tone="danger" className="mt-4 items-center">
      <AlertCircle aria-hidden="true" />
      <div className="flex-1">
        <p className="font-medium">Processing failed during “{step}”.</p>
        <p className="mt-0.5">
          {ui ? `${ui.title}. ${ui.message}` : "Retry to continue from that step. Your data is kept."}
          {ui?.traceId && <span className="ml-1 font-mono text-mono-sm">Trace ID: {ui.traceId}</span>}
        </p>
      </div>
      <Button size="sm" variant="destructive" disabled={retry.isPending} onClick={() => retry.mutate()}>
        {retry.isPending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <RotateCcw />}
        Retry
      </Button>
    </Alert>
  );
}

/** AC1 + AC5: tabs; the ones the proposal hasn't reached are disabled with the reason. */
function ProposalTabs({ proposal }: { proposal: Proposal }) {
  const pathname = usePathname();
  const active = (tab: ProposalTab) => pathname === tabHref(proposal.id, tab);
  return (
    <nav aria-label="Proposal sections" className="mb-6 flex items-center gap-6 border-b border-border">
      {PROPOSAL_TABS.map(({ tab, label, hint }) => {
        const base =
          "-mb-px inline-flex h-10 items-center border-b-2 border-transparent text-body-sm font-medium transition-colors";
        if (!isTabAvailable(tab, proposal.status, proposal.previousStatus)) {
          return (
            <span key={tab} className="contents">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      role="link"
                      aria-disabled="true"
                      tabIndex={0}
                      aria-describedby={`tab-hint-${tab}`}
                      className={cn(base, "cursor-not-allowed text-muted-foreground/60")}
                    />
                  }
                >
                  {label}
                </TooltipTrigger>
                <TooltipContent>{hint}</TooltipContent>
              </Tooltip>
              {/* Outside the tab so it is its description, not part of its name. */}
              <span id={`tab-hint-${tab}`} className="sr-only">
                {hint}
              </span>
            </span>
          );
        }
        return (
          <Link
            key={tab}
            href={tabHref(proposal.id, tab)}
            aria-current={active(tab) ? "page" : undefined}
            className={cn(
              base,
              "text-muted-foreground hover:text-foreground",
              active(tab) && "border-brand text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
