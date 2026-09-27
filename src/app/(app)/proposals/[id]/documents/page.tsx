import type { Metadata } from "next";

import { ProposalDocumentsUpload } from "@/features/documents";

export const metadata: Metadata = { title: "Documents" };

/** Documents tab. The proposal layout already checks the id and renders the page heading (US-FE-07). */
export default async function ProposalDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <section aria-labelledby="documents-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="documents-heading" className="text-panel-title font-semibold text-foreground">
          Documents
        </h2>
        <p className="mt-1 text-body-sm text-muted-foreground">
          Upload the RFP and supporting documents for this proposal.
        </p>
      </div>
      {/* Same casing as the layout, so both share the proposal's query key. */}
      <ProposalDocumentsUpload proposalId={id.toLowerCase()} />
    </section>
  );
}
