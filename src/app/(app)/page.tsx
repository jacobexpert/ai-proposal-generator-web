import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadingState } from "@/components/feedback/loading-state";
import { ProposalList } from "@/features/proposals/proposal-list";

export const metadata: Metadata = { title: "Dashboard" };

/** Screen 1 (US-FE-05): the workspace's proposals, their status and what needs attention next. */
export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading proposals" />}>
      <ProposalList title="Dashboard" description="Your proposals, their status and what needs attention next." />
    </Suspense>
  );
}
