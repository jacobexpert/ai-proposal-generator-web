import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkspaceGate, WorkspaceProvider } from "@/features/workspaces";
import { TEST_WORKSPACES } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { createNavigation } from "@/test/navigation";
import { makeProposal, proposalApi, TEMPLATE, type ProposalApiState } from "@/test/proposals";

import { CONCURRENT_EDIT_MESSAGE } from "./edit-proposal-dialog";
import { ProposalOverview } from "./proposal-overview";
import { ProposalShell } from "./proposal-shell";

const nav = vi.hoisted(() => ({ current: undefined as unknown as ReturnType<typeof createNavigation> }));
vi.mock("next/navigation", () => ({
  useRouter: () => nav.current.module.useRouter(),
  usePathname: () => nav.current.module.usePathname(),
  useSearchParams: () => nav.current.module.useSearchParams(),
}));

const { acme, globex } = TEST_WORKSPACES;
const ID = "bbbbbbbb-1111-4222-8333-444444444444";
let state: ProposalApiState;

beforeEach(() => {
  nav.current = createNavigation(`/proposals/${ID}`);
  state = { proposals: [makeProposal()], templates: [TEMPLATE], requests: [] };
  server.use(...proposalApi(state));
});

function setup(workspaceId: string = acme.id) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <WorkspaceProvider initialWorkspaceId={workspaceId}>
          <WorkspaceGate>
            <ProposalShell proposalId={ID}>
              <ProposalOverview proposalId={ID} />
            </ProposalShell>
          </WorkspaceGate>
        </WorkspaceProvider>
      </TooltipProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

describe("ProposalShell (US-FE-07)", () => {
  it("shows the header, the overview and the tabs; unreached tabs are disabled with a reason (AC1, AC5)", async () => {
    setup();
    expect(await screen.findByRole("heading", { level: 1, name: "Core banking modernization" })).toBeInTheDocument();
    expect(screen.getByText("Draft", { selector: "[data-slot=status-badge]" })).toBeInTheDocument();
    const details = screen.getByRole("region", { name: "Details" });
    expect(details).toHaveTextContent("Deadline" + "Jan 15, 2030");
    expect(details).toHaveTextContent("$250,000.00");
    expect(await within(details).findByText("Standard IT proposal")).toBeInTheDocument();

    const tabs = screen.getByRole("navigation", { name: "Proposal sections" });
    expect(within(tabs).getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    expect(within(tabs).getByRole("link", { name: "Documents" })).toHaveAttribute("href", `/proposals/${ID}/documents`);
    const requirements = within(tabs).getByRole("link", { name: "Requirements" });
    expect(requirements).toHaveAttribute("aria-disabled", "true");
    expect(requirements).toHaveAccessibleDescription("Available once documents are analyzed.");
  });

  it("shows the lifecycle with the current step (AC2)", async () => {
    state.proposals = [makeProposal({ status: "REQUIREMENTS_REVIEW" })];
    setup();
    const steps = await screen.findByRole("list", { name: "Proposal progress" });
    expect(within(steps).getAllByRole("listitem")).toHaveLength(10);
    expect(within(steps).getByText("Requirements review").closest("li")).toHaveAttribute("aria-current", "step");
    expect(within(steps).getByText("Draft").closest("li")).toHaveTextContent("(done)");
  });

  it("FAILED shows where it failed and retries (AC2)", async () => {
    state.proposals = [makeProposal({ status: "FAILED", previousStatus: "ANALYZING" })];
    const user = setup();
    expect(await screen.findByText("Processing failed during “Analyzing”.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.queryByText(/Processing failed/)).not.toBeInTheDocument());
    expect(screen.getByText("Analyzing", { selector: "[data-slot=status-badge]" })).toBeInTheDocument();
    expect(state.requests.some((r) => r.method === "POST" && r.path === `/api/proposals/${ID}/retry`)).toBe(true);
  });

  it("edits details with the version and saves only what changed (AC3)", async () => {
    const user = setup();
    await user.click(await screen.findByRole("button", { name: "Edit details" }));
    const dialog = await screen.findByRole("dialog");
    const name = await within(dialog).findByLabelText("Proposal name");
    await user.clear(name);
    await user.type(name, "Core banking — phase 1");
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Core banking — phase 1"));
    expect(state.requests.find((r) => r.method === "PATCH")!.body).toEqual({
      name: "Core banking — phase 1",
      version: 1,
    });
  });

  it("explains a concurrent edit (409) and offers the latest version (AC3)", async () => {
    const user = setup();
    await user.click(await screen.findByRole("button", { name: "Edit details" }));
    const dialog = await screen.findByRole("dialog");
    state.proposals[0]!.version = 5; // someone else saved meanwhile
    const industry = await within(dialog).findByLabelText("Customer industry");
    await user.type(industry, " & Finance");
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));
    expect(await within(dialog).findByText(CONCURRENT_EDIT_MESSAGE)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Load the latest version" })).toBeInTheDocument();
  });

  it("warns that editing an approved proposal sends it back to review", async () => {
    state.proposals = [makeProposal({ status: "APPROVED" })];
    const user = setup();
    await user.click(await screen.findByRole("button", { name: "Edit details" }));
    expect(await screen.findByText(/Saving changes moves it back to review/)).toBeInTheDocument();
  });

  it("the creator deletes a draft after confirming (AC4)", async () => {
    const user = setup(globex.id); // a MEMBER there, but the creator
    await user.click(await screen.findByRole("button", { name: "More actions" }));
    await user.click(await screen.findByRole("menuitem", { name: "Delete draft" }));
    const confirm = await screen.findByRole("alertdialog");
    await user.click(within(confirm).getByRole("button", { name: "Delete draft" }));
    await waitFor(() => expect(nav.current.router.push).toHaveBeenCalledWith("/proposals"));
    expect(state.proposals).toHaveLength(0);
  });

  it("no delete for non-drafts, or for members who didn't create it (AC4, D3)", async () => {
    state.proposals = [makeProposal({ createdBy: "99999999-9999-4999-8999-999999999999" })];
    setup(globex.id);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("button", { name: "More actions" })).not.toBeInTheDocument();
  });

  it("shows not-found for a proposal of another workspace (404)", async () => {
    state.proposals = [];
    setup();
    expect(await screen.findByText("Not found or you don't have access")).toBeInTheDocument();
  });
});
