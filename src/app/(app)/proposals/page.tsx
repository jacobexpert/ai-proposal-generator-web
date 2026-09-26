import { FileText } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Proposals" };

export default function ProposalsPage() {
  return (
    <>
      <PageHeader title="Proposals" />
      <ComingSoon icon={FileText} message="Proposals in this workspace will be listed here." />
    </>
  );
}
