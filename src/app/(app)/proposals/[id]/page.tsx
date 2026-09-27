import type { Metadata } from "next";

import { ProposalOverview } from "@/features/proposals/proposal-overview";

export const metadata: Metadata = { title: "Proposal" };

export default async function ProposalOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProposalOverview proposalId={id.toLowerCase()} />;
}
