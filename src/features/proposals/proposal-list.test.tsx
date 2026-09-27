import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WorkspaceGate, WorkspaceProvider } from "@/features/workspaces";
import { TEST_WORKSPACES } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { createNavigation } from "@/test/navigation";
import { makeProposal, proposalApi, TEMPLATE, type ProposalApiState } from "@/test/proposals";

import { ProposalList } from "./proposal-list";

const nav = vi.hoisted(() => ({ current: undefined as unknown as ReturnType<typeof createNavigation> }));
vi.mock("next/navigation", () => ({
  useRouter: () => nav.current.module.useRouter(),
  usePathname: () => nav.current.module.usePathname(),
  useSearchParams: () => nav.current.module.useSearchParams(),
}));

const { acme } = TEST_WORKSPACES;
let state: ProposalApiState;

beforeEach(() => {
  nav.current = createNavigation("/proposals");
  state = { proposals: [], templates: [TEMPLATE], requests: [] };
  server.use(...proposalApi(state));
});

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <WorkspaceProvider initialWorkspaceId={acme.id}>
        <WorkspaceGate>
          <ProposalList title="Proposals" />
        </WorkspaceGate>
      </WorkspaceProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

const listRequests = () => state.requests.filter((r) => r.method === "GET" && r.path === "/api/proposals");

describe("ProposalList (US-FE-05)", () => {
  it("lists name, customer, status, deadline and last update, scoped to the workspace (AC1)", async () => {
    const soon = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    state.proposals = [
      makeProposal({
        status: "REQUIREMENTS_REVIEW",
        deadline: soon,
        updatedAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
      }),
    ];
    setup();
    const table = await screen.findByRole("table", { name: "Proposals" });
    const row = within(table).getAllByRole("row")[1]!;
    expect(row).toHaveTextContent("Core banking modernization");
    expect(row).toHaveTextContent("Contoso Bank");
    expect(row).toHaveTextContent("Requirements review");
    expect(row).toHaveTextContent("Due in 2 days"); // AC5
    expect(row).toHaveTextContent("3 hours ago");
    // AC3: opens the screen for its status.
    expect(within(row).getByRole("link", { name: "Core banking modernization" })).toHaveAttribute(
      "href",
      `/proposals/${state.proposals[0]!.id}/requirements`,
    );
    expect(listRequests()[0]).toMatchObject({
      workspace: acme.id,
      query: { page: "0", size: "20", sort: "updatedAt", direction: "desc" },
    });
  });

  it("searches (debounced), filters by status and sorts via the URL (AC2)", async () => {
    state.proposals = [
      makeProposal(),
      makeProposal({ id: "eeeeeeee-1111-4222-8333-444444444444", name: "Data platform", customerName: "Fabrikam" }),
    ];
    const user = setup();
    await screen.findByRole("table", { name: "Proposals" });

    await user.type(screen.getByRole("searchbox", { name: /Search/ }), "fabri");
    await waitFor(() =>
      expect(nav.current.router.replace).toHaveBeenLastCalledWith("/proposals?q=fabri", { scroll: false }),
    );
    await waitFor(() => expect(screen.getAllByRole("row")).toHaveLength(2));
    expect(screen.getByRole("table")).toHaveTextContent("Data platform");
    expect(listRequests().filter((r) => r.query?.q?.startsWith("f"))).toHaveLength(1); // one call, not one per key

    await user.selectOptions(screen.getByRole("combobox", { name: "Filter by status" }), "DRAFT");
    await user.selectOptions(screen.getByRole("combobox", { name: "Sort" }), "deadline");
    await waitFor(() =>
      expect(listRequests().at(-1)!.query).toMatchObject({
        q: "fabri",
        status: "DRAFT",
        sort: "deadline",
        direction: "asc",
      }),
    );
  });

  it("follows the URL when it changes from outside (back/forward)", async () => {
    setup();
    await screen.findByText("Create your first proposal");
    act(() => nav.current.set("/proposals?q=contoso"));
    await waitFor(() => expect(screen.getByRole("searchbox", { name: /Search/ })).toHaveValue("contoso"));
  });

  it("paginates (AC2)", async () => {
    state.proposals = Array.from({ length: 25 }, (_, i) =>
      makeProposal({ id: `bbbbbbbb-1111-4222-8333-${String(i).padStart(12, "0")}`, name: `Proposal ${i + 1}` }),
    );
    const user = setup();
    expect(await screen.findByText("Page 1 of 2 · 25 proposals")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Previous/ })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /Next/ }));
    expect(await screen.findByText("Page 2 of 2 · 25 proposals")).toBeInTheDocument();
    expect(listRequests().at(-1)!.query).toMatchObject({ page: "1" });
    expect(nav.current.router.replace).toHaveBeenLastCalledWith("/proposals?page=2", { scroll: false });
  });

  it("guides the first proposal, and distinguishes 'no match' (AC4)", async () => {
    const user = setup();
    expect(await screen.findByText("Create your first proposal")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /New proposal/ })[0]).toHaveAttribute("href", "/proposals/new");

    act(() => nav.current.set("/proposals?status=APPROVED"));
    expect(await screen.findByText("No proposals match")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(await screen.findByText("Create your first proposal")).toBeInTheDocument();
  });

  it("renders names as text", async () => {
    state.proposals = [makeProposal({ name: "<img src=x onerror=alert(1)>" })];
    setup();
    expect(await screen.findByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });
});
