import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadingState } from "@/components/feedback/loading-state";
import { ProposalWizard } from "@/features/proposals/proposal-wizard";

export const metadata: Metadata = { title: "New proposal" };

export default function NewProposalPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading" />}>
      <ProposalWizard />
    </Suspense>
  );
}
