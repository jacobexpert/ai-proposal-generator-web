"use client";

import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { useCurrentWorkspace } from "@/features/workspaces";

import { formatDeadline, timeAgo } from "./format";
import { LANGUAGES } from "./proposal-form";
import { useProposal, useTemplate } from "./queries";

const money = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(value);
  } catch {
    return `${value} ${currency}`;
  }
};

/** US-FE-07 AC1: the Overview tab — everything captured about the opportunity. */
export function ProposalOverview({ proposalId }: { proposalId: string }) {
  const workspace = useCurrentWorkspace();
  const proposal = useProposal(workspace.id, proposalId);
  const template = useTemplate(workspace.id, proposal.data?.templateId);
  if (proposal.isPending) return <LoadingState label="Loading proposal" />;
  if (proposal.isError) return <ErrorState error={proposal.error} onRetry={() => void proposal.refetch()} />;
  const p = proposal.data;
  const language = LANGUAGES.find(([code]) => code === p.language)?.[1] ?? p.language;

  const rows: [string, string | null | undefined][] = [
    ["Customer", p.customerName],
    ["Industry", p.customerIndustry],
    ["Deadline", formatDeadline(p.deadline)],
    ["Language", language],
    ["Currency", p.currency],
    ["Template", template.data?.name ?? (template.isError ? "Unavailable" : "…")],
    ["Opportunity value", p.opportunityValue != null ? money(p.opportunityValue, p.currency) : null],
    ["Customer website", p.customerWebsite],
    ["Account manager", p.accountManager],
    ["Solution architect", p.solutionArchitect],
    ["Sales owner", p.salesOwner],
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <section aria-labelledby="opportunity-heading" className="rounded-xl border border-border bg-card p-6">
        <h2 id="opportunity-heading" className="text-panel-title font-semibold text-foreground">
          Opportunity
        </h2>
        <p className="mt-3 text-body-sm whitespace-pre-wrap text-foreground">{p.opportunityDescription}</p>
        {p.internalNotes && (
          <>
            <h3 className="mt-6 text-body-sm font-semibold text-foreground">Internal notes</h3>
            <p className="mt-1 text-body-sm whitespace-pre-wrap text-muted-foreground">{p.internalNotes}</p>
          </>
        )}
      </section>
      <section aria-labelledby="details-heading" className="rounded-xl border border-border bg-card p-6">
        <h2 id="details-heading" className="text-panel-title font-semibold text-foreground">
          Details
        </h2>
        <dl className="mt-4 flex flex-col gap-3 text-body-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[9rem_1fr] gap-3">
              <dt className="text-muted-foreground">{label}</dt>
              {/* Text only: never linkified or rendered as HTML. */}
              <dd className="break-words text-foreground">
                {value || <span className="text-muted-foreground">—</span>}
              </dd>
            </div>
          ))}
          <div className="grid grid-cols-[9rem_1fr] gap-3">
            <dt className="text-muted-foreground">Last updated</dt>
            <dd className="text-foreground">{timeAgo(p.updatedAt)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
