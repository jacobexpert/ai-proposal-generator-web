import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import { FakeXhr } from "@/features/documents/test-utils";
import { WorkspaceGate, WorkspaceProvider } from "@/features/workspaces";
import { TEST_WORKSPACES } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { createNavigation } from "@/test/navigation";
import { makeProposal, proposalApi, TEMPLATE, type ProposalApiState } from "@/test/proposals";

import { ProposalWizard } from "./proposal-wizard";

const nav = vi.hoisted(() => ({ current: undefined as unknown as ReturnType<typeof createNavigation> }));
vi.mock("next/navigation", () => ({
  useRouter: () => nav.current.module.useRouter(),
  usePathname: () => nav.current.module.usePathname(),
  useSearchParams: () => nav.current.module.useSearchParams(),
}));

const { acme, globex } = TEST_WORKSPACES;
let state: ProposalApiState;

beforeEach(() => {
  nav.current = createNavigation("/proposals/new");
  state = { proposals: [], templates: [TEMPLATE], requests: [] };
  server.use(...proposalApi(state));
  FakeXhr.reset();
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
});
afterEach(() => vi.unstubAllGlobals());

function setup(workspaceId: string = acme.id) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <WorkspaceProvider initialWorkspaceId={workspaceId}>
          <WorkspaceGate>
            <ProposalWizard />
          </WorkspaceGate>
        </WorkspaceProvider>
      </TooltipProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

async function fillRequired(user: ReturnType<typeof userEvent.setup>, { template = true } = {}) {
  await user.type(await screen.findByLabelText("Proposal name"), "Core banking");
  await user.type(screen.getByLabelText("Customer name"), "Contoso Bank");
  await user.type(screen.getByLabelText("Customer industry"), "Banking");
  await user.type(screen.getByLabelText("Opportunity description"), "Move the core to Azure.");
  await user.type(screen.getByLabelText("Deadline"), "2030-01-15");
  if (template) await user.selectOptions(await screen.findByLabelText("Template"), TEMPLATE.id);
}

describe("ProposalWizard (US-FE-06)", () => {
  it("shows the 5 steps and validates step 1 before creating anything (AC1, AC3)", async () => {
    const user = setup();
    const steps = await screen.findByRole("list", { name: "Steps" });
    expect(
      within(steps)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["1Basic info", "2Documents", "3Company knowledge", "4Template", "5Review"]);
    await user.type(await screen.findByLabelText(/Customer website/), "contoso.com");
    await user.click(screen.getByRole("button", { name: "Create and continue" }));
    expect(await screen.findByText("Enter a proposal name.")).toBeInTheDocument();
    expect(screen.getByText("Choose a deadline.")).toBeInTheDocument();
    expect(screen.getByText("Choose a template.")).toBeInTheDocument();
    expect(screen.getByText("Enter a full web address starting with https://")).toBeInTheDocument();
    expect(state.requests.some((r) => r.method === "POST")).toBe(false);
  });

  it("creates the proposal after step 1 and continues on it (AC2, AC4)", async () => {
    const user = setup();
    await fillRequired(user);
    await user.type(screen.getByLabelText(/Opportunity value/), "250000");
    await user.selectOptions(screen.getByLabelText("Currency"), "EUR");
    await user.click(screen.getByRole("button", { name: "Create and continue" }));

    await waitFor(() =>
      expect(nav.current.router.replace).toHaveBeenLastCalledWith(
        "/proposals/new?proposalId=dddddddd-1111-4222-8333-444444444444&step=2",
        { scroll: false },
      ),
    );
    expect(state.requests.find((r) => r.method === "POST" && r.path === "/api/proposals")!.body).toEqual({
      name: "Core banking",
      customerName: "Contoso Bank",
      customerIndustry: "Banking",
      opportunityDescription: "Move the core to Azure.",
      deadline: "2030-01-15",
      language: "en",
      currency: "EUR",
      templateId: TEMPLATE.id,
      opportunityValue: 250000,
    });
    expect(await screen.findByText("Customer documents")).toBeInTheDocument();
  });

  it("resumes a saved proposal: back to step 1 updates only what changed (AC4)", async () => {
    state.proposals = [makeProposal({ id: "dddddddd-1111-4222-8333-444444444444" })];
    nav.current.set("/proposals/new?proposalId=dddddddd-1111-4222-8333-444444444444");
    const user = setup();
    const name = await screen.findByLabelText("Proposal name");
    expect(name).toHaveValue("Core banking modernization");
    await user.clear(name);
    await user.type(name, "Core banking v2");
    await user.click(screen.getByRole("button", { name: "Save and continue" }));
    await waitFor(() => expect(state.requests.find((r) => r.method === "PATCH")).toBeDefined());
    expect(state.requests.find((r) => r.method === "PATCH")!.body).toEqual({ name: "Core banking v2", version: 1 });
  });

  it("owners without templates create one on the spot, and it gets selected (decision 2026-09-27)", async () => {
    state.templates = [];
    const user = setup();
    await user.click(await screen.findByRole("button", { name: "Create a template" }));
    const dialog = await screen.findByRole("dialog");
    expect((within(dialog).getByLabelText("Sections") as HTMLTextAreaElement).value).toContain("Executive Summary");
    expect(within(dialog).getByText("22/50")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Create template" }));

    const template = await screen.findByLabelText("Template");
    await waitFor(() => expect(template).toHaveValue("cccccccc-1111-4222-8333-444444444444"));
    const created = state.requests.find((r) => r.method === "POST" && r.path === "/api/templates")!.body as {
      name: string;
      sections: { key: string; title: string; requiresUserInput: boolean }[];
    };
    expect(created.name).toBe("Standard IT proposal");
    expect(created.sections).toHaveLength(22);
    expect(created.sections.find((s) => s.title === "Commercial Overview")).toMatchObject({
      key: "commercial-overview",
      requiresUserInput: true,
    });
  });

  it("members without templates are told to ask an owner and cannot continue", async () => {
    state.templates = [];
    setup(globex.id);
    expect(await screen.findByText(/Ask a workspace owner to create one/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create a template" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create and continue" })).toBeDisabled();
  });

  it("steps 2–5: optional documents, template sections, review without one-click generation (AC5, AC6)", async () => {
    const ID = "dddddddd-1111-4222-8333-444444444444";
    state.proposals = [makeProposal({ id: ID })];
    state.templates = [TEMPLATE, { ...TEMPLATE, id: "ffffffff-1111-4222-8333-444444444444", name: "Short form" }];
    nav.current.set(`/proposals/new?proposalId=${ID}&step=2`);
    const user = setup();

    expect(await screen.findByText("Customer documents")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Documents tab" })).toHaveAttribute("href", `/proposals/${ID}/documents`);
    expect(screen.getByRole("button", { name: "Choose files" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Company knowledge", { selector: "h2" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // Step 4: sections with "input required", and switching template saves it.
    expect(await screen.findByText("Commercial Overview")).toBeInTheDocument();
    expect(screen.getByText("Input required")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Template"), "ffffffff-1111-4222-8333-444444444444");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() =>
      expect(state.requests.find((r) => r.method === "PATCH")!.body).toEqual({
        templateId: "ffffffff-1111-4222-8333-444444444444",
        version: 1,
      }),
    );

    // Step 5
    expect(await screen.findByRole("heading", { name: "Review" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Analyze documents/ })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /generate/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open proposal" })).toHaveAttribute("href", `/proposals/${ID}`);
  });

  it("steps 2/3 upload with the right default category and wait for the queue before moving on (AC5)", async () => {
    const ID = "dddddddd-1111-4222-8333-444444444444";
    state.proposals = [makeProposal({ id: ID, version: 1 })];
    state.templates = [TEMPLATE, { ...TEMPLATE, id: "ffffffff-1111-4222-8333-444444444444", name: "Short form" }];
    nav.current.set(`/proposals/new?proposalId=${ID}&step=2`);
    const user = setup();
    const input = async () => (await screen.findByTestId("document-file-input")) as HTMLInputElement;
    const upload = userEvent.setup({ applyAccept: false });

    // Step 2: customer documents default to RFP.
    await upload.upload(await input(), new File(["%PDF-1.7"], "rfp.pdf"));
    expect(screen.getByRole("combobox", { name: "Category for rfp.pdf" })).toHaveTextContent("RFP");
    // Chosen but not sent: leaving would drop it.
    expect(screen.getByText("1 file chosen but not uploaded. Upload or remove it to continue.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Basic info/ })).not.toBeInTheDocument(); // no jumping away

    await user.click(screen.getByRole("button", { name: "Upload" }));
    expect(FakeXhr.requests[0]!.url).toBe(`/api/backend/api/proposals/${ID}/documents?category=RFP`);
    expect(screen.getByText("Uploading 1 file. Wait until it finishes before leaving this step.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();

    // What the API does on the first upload (US-BE-07): new status, new version.
    Object.assign(state.proposals[0]!, { status: "DOCUMENTS_UPLOADED", version: 2 });
    await act(async () => FakeXhr.requests[0]!.succeed());
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // Step 3: company knowledge defaults to Company profile.
    expect(await screen.findByText("Company knowledge", { selector: "h2" })).toBeInTheDocument();
    await upload.upload(await input(), new File(["profile"], "profile.md"));
    expect(screen.getByRole("combobox", { name: "Category for profile.md" })).toHaveTextContent("Company profile");
    await user.click(screen.getByRole("button", { name: "Remove profile.md" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // Step 4 saves with the proposal's current version, not the one from before the upload.
    await user.selectOptions(await screen.findByLabelText("Template"), "ffffffff-1111-4222-8333-444444444444");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() =>
      expect(state.requests.find((r) => r.method === "PATCH")!.body).toEqual({
        templateId: "ffffffff-1111-4222-8333-444444444444",
        version: 2,
      }),
    );
    expect(await screen.findByRole("heading", { name: "Review" })).toBeInTheDocument();
    expect(screen.getByText("Documents uploaded")).toBeInTheDocument();
  });

  it("jumps back to a done step from the stepper", async () => {
    const ID = "dddddddd-1111-4222-8333-444444444444";
    state.proposals = [makeProposal({ id: ID })];
    nav.current.set(`/proposals/new?proposalId=${ID}&step=3`);
    const user = setup();
    await user.click(await screen.findByRole("button", { name: /Basic info/ }));
    expect(nav.current.router.replace).toHaveBeenLastCalledWith(`/proposals/new?proposalId=${ID}`, { scroll: false });
  });
});
