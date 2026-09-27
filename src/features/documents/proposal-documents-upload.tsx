"use client";

import { useQueryClient } from "@tanstack/react-query";

import { proposalKey } from "@/features/proposals/queries";
import { useCurrentWorkspace } from "@/features/workspaces";

import { DocumentUploader } from "./document-uploader";
import { documentsKey } from "./query-keys";

/** Documents tab of a proposal: upload for the current workspace (the list arrives with US-FE-09). */
export function ProposalDocumentsUpload({ proposalId }: { proposalId: string }) {
  const workspace = useCurrentWorkspace();
  const queryClient = useQueryClient();
  return (
    <DocumentUploader
      workspaceId={workspace.id}
      proposalId={proposalId}
      onDocumentsChanged={() => {
        void queryClient.invalidateQueries({ queryKey: documentsKey(workspace.id, proposalId) });
        // The first upload moves the proposal DRAFT → DOCUMENTS_UPLOADED and bumps its version:
        // refresh the header, stepper, tabs and the version used by "Edit details".
        void queryClient.invalidateQueries({ queryKey: proposalKey(workspace.id, proposalId) });
      }}
    />
  );
}
