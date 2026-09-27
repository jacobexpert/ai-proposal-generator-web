import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WorkspaceGate, WorkspaceProvider } from "@/features/workspaces";
import { BFF_BASE_URL, TEST_USER, TEST_WORKSPACES } from "@/mocks/handlers";
import { server } from "@/mocks/server";

import { invitationLink } from "./api";
import { OWNER_REQUIRED_MESSAGE } from "./format";
import { MembersSettings } from "./members-settings";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/settings/members" }));

const { acme, globex } = TEST_WORKSPACES;
const base = (ws: string) => `${BFF_BASE_URL}/api/workspaces/${ws}`;

const ME = {
  userId: TEST_USER.id,
  email: TEST_USER.email,
  displayName: TEST_USER.displayName,
  role: "OWNER",
  joinedAt: "2026-09-01T08:00:00Z",
};
const ALEX = {
  userId: "22222222-3333-4444-8555-666666666666",
  email: "alex@example.com",
  displayName: "Alex Pham",
  role: "MEMBER",
  joinedAt: "2026-09-10T08:00:00Z",
};
const PENDING = {
  id: "33333333-4444-4555-8666-777777777777",
  email: "sam@example.com",
  role: "MEMBER",
  status: "PENDING",
  createdAt: "2026-09-20T08:00:00Z",
  expiresAt: "2026-09-27T08:00:00Z",
};

let members: object[];
let invitations: object[];
let invitationsRequested: number;

beforeEach(() => {
  members = [ME, ALEX];
  invitations = [PENDING];
  invitationsRequested = 0;
  server.use(
    http.get(`${base(":ws")}/members`, () => HttpResponse.json(members)),
    http.get(`${base(":ws")}/invitations`, () => {
      invitationsRequested += 1;
      return HttpResponse.json(invitations);
    }),
  );
});

function setup(workspaceId: string = acme.id) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <WorkspaceProvider initialWorkspaceId={workspaceId}>
        <WorkspaceGate>
          <MembersSettings />
        </WorkspaceGate>
      </WorkspaceProvider>
    </QueryClientProvider>,
  );
  return { user: userEvent.setup(), client };
}

const problem = (status: number) =>
  HttpResponse.json({ status, title: "x" }, { status, headers: { "Content-Type": "application/problem+json" } });

describe("MembersSettings — viewing (AC1, AC2, AC6)", () => {
  it("members see the list but none of the owner controls", async () => {
    setup(globex.id); // TEST_USER is a MEMBER of Globex
    const table = await screen.findByRole("table", { name: "Workspace members" });
    expect(within(table).getByText("Alex Pham")).toBeInTheDocument();
    expect(within(table).getByText("alex@example.com")).toBeInTheDocument();
    expect(within(table).getByText("Sep 10, 2026")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Invite member" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Actions for/ })).not.toBeInTheDocument();
    expect(invitationsRequested).toBe(0); // owner-only endpoint never called
  });

  it("owners get the invite button, a pending tab and actions for others (not themselves)", async () => {
    setup();
    expect(await screen.findByRole("button", { name: "Invite member" })).toBeInTheDocument();
    expect(await screen.findByRole("tab", { name: /Members 2/ })).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByRole("tab", { name: /Pending invitations 1/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Actions for Alex Pham" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: `Actions for ${TEST_USER.displayName}` })).not.toBeInTheDocument();
    expect(screen.getByText("(you)")).toBeInTheDocument();
  });

  it("renders names and emails as text", async () => {
    members = [ME, { ...ALEX, displayName: "<img src=x onerror=alert(1)>" }];
    setup();
    expect(await screen.findByText("<img src=x onerror=alert(1)>")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });

  it("shows an error with retry when the list fails", async () => {
    server.use(http.get(`${base(acme.id)}/members`, () => problem(500)));
    setup();
    expect(await screen.findByRole("button", { name: /try again/i })).toBeInTheDocument();
  });
});

describe("MembersSettings — invite (AC3)", () => {
  it("validates, creates the invitation and shows the one-time link with copy", async () => {
    let body: unknown;
    server.use(
      http.post(`${base(acme.id)}/invitations`, async ({ request }) => {
        body = await request.json();
        invitations = [
          PENDING,
          { ...PENDING, id: "44444444-5555-4666-8777-888888888888", email: "new@example.com", role: "OWNER" },
        ];
        return HttpResponse.json(
          {
            id: "44444444-5555-4666-8777-888888888888",
            email: "new@example.com",
            role: "OWNER",
            status: "PENDING",
            expiresAt: "2026-10-04T08:00:00Z",
            invitationToken: "tok123",
            invitationUrl: "http://localhost:3000/invitations/accept?token=tok123",
          },
          { status: 201 },
        );
      }),
    );
    const { user } = setup();
    await user.click(await screen.findByRole("button", { name: "Invite member" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Create invitation" }));
    expect(await within(dialog).findByText("Enter an email address.")).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText("Email"), "new@example.com");
    await user.click(within(dialog).getByRole("radio", { name: /Owner/ }));
    await user.click(within(dialog).getByRole("button", { name: "Create invitation" }));

    const link = await within(dialog).findByLabelText("Invitation link");
    expect(link).toHaveValue("http://localhost:3000/invitations/accept?token=tok123");
    expect(body).toEqual({ email: "new@example.com", role: "OWNER" });
    expect(within(dialog).getByText(/shown only now and expires on Oct 4, 2026/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Copy link" }));
    expect(await navigator.clipboard.readText()).toBe("http://localhost:3000/invitations/accept?token=tok123");
    expect(within(dialog).getByText("Link copied to the clipboard.")).toBeInTheDocument();

    // Closing forgets the link for good; the pending list has refreshed behind the dialog.
    await user.click(within(dialog).getByRole("button", { name: "Done" }));
    expect(await screen.findByRole("tab", { name: /Pending invitations 2/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Invite member" }));
    expect(await screen.findByLabelText("Email")).toHaveValue("");
    expect(screen.queryByLabelText("Invitation link")).not.toBeInTheDocument();
  });

  it("warns that re-inviting replaces a pending invitation, and maps 409 to 'already a member'", async () => {
    server.use(http.post(`${base(acme.id)}/invitations`, () => problem(409)));
    const { user } = setup();
    await user.click(await screen.findByRole("button", { name: "Invite member" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Email"), "SAM@example.com");
    expect(within(dialog).getByText(/already has a pending invitation/)).toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText("Email"));
    await user.type(within(dialog).getByLabelText("Email"), "alex@example.com");
    await user.click(within(dialog).getByRole("button", { name: "Create invitation" }));
    expect(await within(dialog).findByText("This person is already a member of the workspace.")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
  });
});

describe("MembersSettings — manage (AC4, AC5)", () => {
  it("changes a role after confirmation and refreshes the list", async () => {
    let body: unknown;
    server.use(
      http.patch(`${base(acme.id)}/members/${ALEX.userId}`, async ({ request }) => {
        body = await request.json();
        members = [ME, { ...ALEX, role: "OWNER" }];
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = setup();
    await user.click(await screen.findByRole("button", { name: "Actions for Alex Pham" }));
    await user.click(await screen.findByRole("menuitem", { name: "Make owner" }));
    const confirm = await screen.findByRole("alertdialog");
    expect(confirm).toHaveTextContent("Make Alex Pham an owner?");
    await user.click(within(confirm).getByRole("button", { name: "Make owner" }));

    await waitFor(() => expect(body).toEqual({ role: "OWNER" }));
    const table = screen.getByRole("table", { name: "Workspace members" });
    await waitFor(() => expect(within(table).getAllByText("Owner")).toHaveLength(2));
  });

  it("explains the last-owner rule (409) inside the dialog", async () => {
    server.use(http.delete(`${base(acme.id)}/members/${ALEX.userId}`, () => problem(409)));
    const { user } = setup();
    await user.click(await screen.findByRole("button", { name: "Actions for Alex Pham" }));
    await user.click(await screen.findByRole("menuitem", { name: "Remove from workspace" }));
    const confirm = await screen.findByRole("alertdialog");
    expect(confirm).toHaveTextContent("alex@example.com loses access");
    await user.click(within(confirm).getByRole("button", { name: "Remove" }));
    expect(await within(confirm).findByText(OWNER_REQUIRED_MESSAGE)).toBeInTheDocument();
  });

  it("revokes a pending invitation without ever showing its link", async () => {
    let revoked = false;
    server.use(
      http.delete(`${base(acme.id)}/invitations/${PENDING.id}`, () => {
        revoked = true;
        invitations = [];
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = setup();
    await user.click(await screen.findByRole("tab", { name: /Pending invitations/ }));
    const table = await screen.findByRole("table", { name: "Pending invitations" });
    expect(within(table).getByText("sam@example.com")).toBeInTheDocument();
    expect(table).not.toHaveTextContent(/token|http/i);

    await user.click(within(table).getByRole("button", { name: "Revoke invitation for sam@example.com" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Revoke" }));
    await waitFor(() => expect(revoked).toBe(true));
    expect(await screen.findByText("No pending invitations")).toBeInTheDocument();
  });
});

describe("invitationLink", () => {
  it("uses the API's link only when it is an http(s) link to the accept page", () => {
    expect(
      invitationLink({ invitationToken: "t", invitationUrl: "https://app.example.com/invitations/accept?token=t" }),
    ).toBe("https://app.example.com/invitations/accept?token=t");
    expect(invitationLink({ invitationToken: "t", invitationUrl: "javascript:alert(1)//invitations/accept" })).toBe(
      "http://localhost:3000/invitations/accept?token=t",
    );
    expect(invitationLink({ invitationToken: "a b" })).toBe("http://localhost:3000/invitations/accept?token=a+b");
  });
});
