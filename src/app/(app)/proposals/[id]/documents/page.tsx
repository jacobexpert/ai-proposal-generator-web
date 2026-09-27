import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { ProposalDocumentsUpload } from "@/features/documents";

export const metadata: Metadata = { title: "Documents" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ProposalDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  return (
    <>
      <PageHeader title="Documents" description="Upload the RFP and supporting documents for this proposal." />
      <ProposalDocumentsUpload proposalId={id} />
    </>
  );
}
