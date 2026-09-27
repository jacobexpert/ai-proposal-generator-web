import type { StatusBadgeProps } from "@/components/ui/status-badge";

/** Lifecycle from spec US-BE-06 (§5): the main path, plus FAILED which can happen at any step. */
export const MAIN_FLOW = [
  "DRAFT",
  "DOCUMENTS_UPLOADED",
  "ANALYZING",
  "REQUIREMENTS_REVIEW",
  "OUTLINE_READY",
  "GENERATING",
  "REVIEW",
  "APPROVAL_PENDING",
  "APPROVED",
  "EXPORTED",
] as const;
export const PROPOSAL_STATUSES = [...MAIN_FLOW, "FAILED"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];
type FlowStatus = (typeof MAIN_FLOW)[number];

export const STATUS_LABEL: Record<ProposalStatus, string> = {
  DRAFT: "Draft",
  DOCUMENTS_UPLOADED: "Documents uploaded",
  ANALYZING: "Analyzing",
  REQUIREMENTS_REVIEW: "Requirements review",
  OUTLINE_READY: "Outline ready",
  GENERATING: "Generating",
  REVIEW: "In review",
  APPROVAL_PENDING: "Approval pending",
  APPROVED: "Approved",
  EXPORTED: "Exported",
  FAILED: "Failed",
};

export const STATUS_TONE: Record<ProposalStatus, NonNullable<StatusBadgeProps["tone"]>> = {
  DRAFT: "neutral",
  DOCUMENTS_UPLOADED: "neutral",
  ANALYZING: "info",
  REQUIREMENTS_REVIEW: "warning",
  OUTLINE_READY: "info",
  GENERATING: "info",
  REVIEW: "warning",
  APPROVAL_PENDING: "warning",
  APPROVED: "success",
  EXPORTED: "success",
  FAILED: "danger",
};

/** Statuses where a background job is running (the badge pulses). */
export const RUNNING: ReadonlySet<ProposalStatus> = new Set(["ANALYZING", "GENERATING"]);

/** Where the proposal really is: for FAILED, the step it failed at (retry returns there). */
export function effectiveStatus(status: ProposalStatus, previousStatus?: ProposalStatus | null): FlowStatus {
  if (status !== "FAILED") return status;
  return previousStatus && previousStatus !== "FAILED" ? previousStatus : "DRAFT";
}

const step = (status: FlowStatus) => MAIN_FLOW.indexOf(status);

export type ProposalTab = "overview" | "documents" | "requirements" | "proposal" | "review" | "exports";

export const PROPOSAL_TABS: readonly { tab: ProposalTab; label: string; from: FlowStatus; hint: string }[] = [
  { tab: "overview", label: "Overview", from: "DRAFT", hint: "" },
  { tab: "documents", label: "Documents", from: "DRAFT", hint: "" },
  { tab: "requirements", label: "Requirements", from: "ANALYZING", hint: "Available once documents are analyzed." },
  { tab: "proposal", label: "Proposal", from: "OUTLINE_READY", hint: "Available once the outline is ready." },
  { tab: "review", label: "Review", from: "REVIEW", hint: "Available once the proposal is generated." },
  { tab: "exports", label: "Exports", from: "APPROVED", hint: "Available once the proposal is approved." },
];

/** US-FE-07 AC5: tabs open up as the proposal moves forward. */
export function isTabAvailable(tab: ProposalTab, status: ProposalStatus, previousStatus?: ProposalStatus | null) {
  const def = PROPOSAL_TABS.find((t) => t.tab === tab)!;
  return step(effectiveStatus(status, previousStatus)) >= step(def.from);
}

export const tabHref = (proposalId: string, tab: ProposalTab) =>
  tab === "overview" ? `/proposals/${proposalId}` : `/proposals/${proposalId}/${tab}`;

/** US-FE-05 AC3: open the screen that matches where the proposal is. */
export function proposalHref(id: string, status: ProposalStatus): string {
  switch (status) {
    case "DOCUMENTS_UPLOADED":
      return tabHref(id, "documents");
    case "ANALYZING":
    case "REQUIREMENTS_REVIEW":
      return tabHref(id, "requirements");
    case "OUTLINE_READY":
    case "GENERATING":
      return tabHref(id, "proposal");
    case "REVIEW":
    case "APPROVAL_PENDING":
      return tabHref(id, "review");
    case "APPROVED":
    case "EXPORTED":
      return tabHref(id, "exports");
    default:
      return tabHref(id, "overview"); // DRAFT, FAILED
  }
}
