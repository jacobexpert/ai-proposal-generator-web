import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppTopbar } from "@/components/layout/app-topbar";
import { BFF_BASE_URL, TEST_USER, TEST_WORKSPACES } from "@/mocks/handlers";
import { server } from "@/mocks/server";

import { LAST_OWNER_LEAVE_MESSAGE, WorkspaceGeneral } from "./workspace-general";
import { WorkspaceGate } from "./workspace-gate";
import { WorkspaceProvider } from "./workspace-context";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/settings/workspace" }));

const { toastWarning, toastSuccess } = vi.hoisted(() => ({ toastWarning: vi.fn(), toastSuccess: vi.fn() }));
vi.mock("sonner", async (orig) => {
  const actual = await orig<typeof import("sonner")>();
  return { ...actual, toast: Object.assign(vi.fn(), actual.toast, { warning: toastWarning, success: toastSuccess }) };
});

const { acme, globex } = TEST_WORKSPACES;
let workspaces: { id: string; name: string; role: string }[];

beforeEach(() => {
  workspaces = [{ ...acme }, { ...globex }];
  router.push.mockClear();
  toastWarning.mockClear();
  toastSuccess.mockClear();
  server.use(
    http.get(`${BFF_BASE_URL}/api/me`, () => HttpResponse.json({ ...TEST_USER, workspaces })),
    http.get(`${BFF_BASE_URL}/api/workspaces/:id`, ({ params }) => {
      const ws = workspaces.find((w) => w.id === params.id);
      return ws
        ? HttpResponse.json({ ...ws, createdAt: "2026-09-01T08:00:00Z" })
        : HttpResponse.json({ status: 404 }, { status: 404 });
    }),
  );
});

function setup(workspaceId: string = acme.id) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <WorkspaceProvider initialWorkspaceId={workspaceId}>
        <AppTopbar />
        <WorkspaceGate>
          <WorkspaceGeneral />
        </WorkspaceGate>
      </WorkspaceProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

describe("WorkspaceGeneral (US-FE-45)", () => {
  it("shows the workspace details and my role (AC1)", async () => {
    setup();
    const section = await screen.findByRole("region", { name: "Workspace" });
    expect(section).toHaveTextContent("Your roleOwner");
    expect(await within(section).findByText("Sep 1, 2026")).toBeInTheDocument();
  });

  it("owners rename the workspace; the switcher shows the new name (AC2)", async () => {
    let body: unknown;
    server.use(
      http.patch(`${BFF_BASE_URL}/api/workspaces/${acme.id}`, async ({ request }) => {
        body = await request.json();
        workspaces[0]!.name = "Acme Advisory";
        return HttpResponse.json({ ...workspaces[0], createdAt: "2026-09-01T08:00:00Z" });
      }),
    );
    const user = setup();
    const input = await screen.findByLabelText("Name");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    await user.clear(input);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Enter a workspace name.")).toBeInTheDocument();

    await user.type(input, "  Acme Advisory  ");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(body).toEqual({ name: "Acme Advisory" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /switch workspace/i })).toHaveTextContent("Acme Advisory"),
    );
    expect(toastSuccess).toHaveBeenCalledWith("Workspace renamed.", { description: undefined });
  });

  it("members only see the name (AC2)", async () => {
    setup(globex.id);
    expect(await screen.findByText("Only owners can rename the workspace.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
  });

  it("leaving removes the workspace, moves to another one without a 'lost access' warning (AC3)", async () => {
    let deletedUser: unknown;
    server.use(
      http.delete(`${BFF_BASE_URL}/api/workspaces/${globex.id}/members/:userId`, ({ params }) => {
        deletedUser = params.userId;
        workspaces = [{ ...acme }];
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = setup(globex.id);
    await user.click(await screen.findByRole("button", { name: "Leave workspace" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Leave workspace" }));

    await waitFor(() => expect(screen.getByRole("button", { name: /switch workspace/i })).toHaveTextContent(acme.name));
    expect(deletedUser).toBe(TEST_USER.id);
    expect(toastSuccess).toHaveBeenCalledWith(`You left “${globex.name}”.`, { description: undefined });
    expect(toastWarning).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith("/");
  });

  it("the last owner cannot leave (409) and is told what to do (AC3)", async () => {
    server.use(
      http.delete(`${BFF_BASE_URL}/api/workspaces/${acme.id}/members/:userId`, () =>
        HttpResponse.json({ status: 409 }, { status: 409, headers: { "Content-Type": "application/problem+json" } }),
      ),
    );
    const user = setup();
    await user.click(await screen.findByRole("button", { name: "Leave workspace" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Leave workspace" }));
    expect(await within(dialog).findByText(LAST_OWNER_LEAVE_MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /switch workspace/i, hidden: true })).toHaveTextContent(acme.name);
  });

  it("leaving the last workspace shows the no-workspace page", async () => {
    workspaces = [{ ...globex }];
    server.use(
      http.delete(`${BFF_BASE_URL}/api/workspaces/${globex.id}/members/:userId`, () => {
        workspaces = [];
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = setup(globex.id);
    await user.click(await screen.findByRole("button", { name: "Leave workspace" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Leave workspace" }));
    expect(await screen.findByText("You're not a member of any workspace yet")).toBeInTheDocument();
  });
});
