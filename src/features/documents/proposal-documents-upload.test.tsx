import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ProposalShell } from "@/features/proposals/proposal-shell";
import { WorkspaceGate, WorkspaceProvider } from "@/features/workspaces";
import { TEST_WORKSPACES } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { createNavigation } from "@/test/navigation";
import { makeProposal, proposalApi, TEMPLATE, type ProposalApiState } from "@/test/proposals";

import { ProposalDocumentsUpload } from "./proposal-documents-upload";
import { FakeXhr } from "./test-utils";

const nav = vi.hoisted(() => ({ current: undefined as unknown as ReturnType<typeof createNavigation> }));
vi.mock("next/navigation", () => ({
  useRouter: () => nav.current.module.useRouter(),
  usePathname: () => nav.current.module.usePathname(),
  useSearchParams: () => nav.current.module.useSearchParams(),
}));

const ID = "bbbbbbbb-1111-4222-8333-444444444444";
let state: ProposalApiState;

beforeEach(() => {
  nav.current = createNavigation(`/proposals/${ID}/documents`);
  state = { proposals: [makeProposal()], templates: [TEMPLATE], requests: [] };
  server.use(...proposalApi(state));
  FakeXhr.reset();
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
});
afterEach(() => vi.unstubAllGlobals());

describe("ProposalDocumentsUpload in the proposal page", () => {
  it("refreshes the proposal after the first upload (DRAFT → DOCUMENTS_UPLOADED, new version)", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <WorkspaceProvider initialWorkspaceId={TEST_WORKSPACES.acme.id}>
            <WorkspaceGate>
              <ProposalShell proposalId={ID}>
                <ProposalDocumentsUpload proposalId={ID} />
              </ProposalShell>
            </WorkspaceGate>
          </WorkspaceProvider>
        </TooltipProvider>
      </QueryClientProvider>,
    );
    const user = userEvent.setup({ applyAccept: false });
    expect(await screen.findByText("Draft", { selector: "[data-slot=status-badge]" })).toBeInTheDocument();

    await user.upload(screen.getByTestId("document-file-input"), new File(["%PDF-1.7"], "rfp.pdf"));
    await user.click(screen.getByRole("button", { name: "Upload" }));
    expect(FakeXhr.requests).toHaveLength(1);

    // What the API does on the first upload (US-BE-07).
    const proposal = state.proposals[0]!;
    Object.assign(proposal, { status: "DOCUMENTS_UPLOADED", version: proposal.version + 1 });
    await act(async () => FakeXhr.requests[0]!.succeed());

    expect(await screen.findByText("Documents uploaded", { selector: "[data-slot=status-badge]" })).toBeInTheDocument();
    expect(screen.queryByText("Draft", { selector: "[data-slot=status-badge]" })).not.toBeInTheDocument();
  });
});
