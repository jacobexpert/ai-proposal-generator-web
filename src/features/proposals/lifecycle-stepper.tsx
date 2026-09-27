import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

import { effectiveStatus, MAIN_FLOW, STATUS_LABEL, type ProposalStatus } from "./status";

/** US-FE-07 AC2: where the proposal is in its lifecycle (spec §5). A failure is shown at the step it happened. */
export function LifecycleStepper({
  status,
  previousStatus,
}: {
  status: ProposalStatus;
  previousStatus?: ProposalStatus | null;
}) {
  const failed = status === "FAILED";
  const current = MAIN_FLOW.indexOf(effectiveStatus(status, previousStatus));
  return (
    <ol aria-label="Proposal progress" className="flex w-full gap-1">
      {MAIN_FLOW.map((step, index) => {
        const state = index < current ? "done" : index === current ? (failed ? "failed" : "current") : "todo";
        return (
          <li
            key={step}
            aria-current={index === current ? "step" : undefined}
            className="flex min-w-0 flex-1 flex-col gap-1.5"
          >
            <span
              aria-hidden="true"
              className={cn(
                "h-1 rounded-full",
                state === "done" && "bg-brand",
                state === "current" && "bg-brand",
                state === "failed" && "bg-danger",
                state === "todo" && "bg-border",
              )}
            />
            <span
              className={cn(
                "flex items-start gap-1 text-caption leading-tight",
                state === "todo" ? "text-muted-foreground" : "text-foreground",
                state === "current" && "font-semibold text-brand-text",
                state === "failed" && "font-semibold text-danger",
              )}
            >
              {state === "done" && <Check aria-hidden="true" className="size-3 shrink-0 text-brand" />}
              <span className="line-clamp-2 break-words" title={STATUS_LABEL[step]}>
                {STATUS_LABEL[step]}
              </span>
              <span className="sr-only">
                {state === "done"
                  ? " (done)"
                  : state === "current"
                    ? " (current)"
                    : state === "failed"
                      ? " (failed)"
                      : ""}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
