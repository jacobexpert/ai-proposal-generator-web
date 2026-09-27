import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadingState } from "@/components/feedback/loading-state";
import { ProposalList } from "@/features/proposals/proposal-list";

export const metadata: Metadata = { title: "Proposals" };

export default function ProposalsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading proposals" />}>
      <ProposalList title="Proposals" description="Every proposal in this workspace." />
    </Suspense>
  );
}
