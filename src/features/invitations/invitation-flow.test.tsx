import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BFF_BASE_URL, TEST_USER, TEST_WORKSPACES } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { renderWithProviders } from "@/test/render";

import { InvitationFlow } from "./invitation-flow";
import { parseInvitationToken, readStoredToken, storeToken } from "./invitation-token";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const { toastSuccess } = vi.hoisted(() => ({ toastSuccess: vi.fn() }));
vi.mock("sonner", async (orig) => {
  const actual = await orig<typeof import("sonner")>();
  return { ...actual, toast: Object.assign(vi.fn(), actual.toast, { success: toastSuccess }) };
});

const TOKEN = "inv-Token_123";
const LOOKUP = `${BFF_BASE_URL}/api/invitations/lookup`;
const ACCEPT = `${BFF_BASE_URL}/api/invitations/accept`;
const REGISTER = "http://localhost:3000/api/auth/register";
const LOGOUT = "http://localhost:3000/api/auth/logout";
const { globex } = TEST_WORKSPACES;

const PREVIEW = {
  workspaceName: globex.name,
  email: TEST_USER.email,
  role: "MEMBER",
  expiresAt: "2026-10-03T09:30:00Z",
};
const problem = (status: number, body: Record<string, unknown> = {}) =>
  HttpResponse.json(
    { status, title: "x", ...body },
    { status, headers: { "Content-Type": "application/problem+json" } },
  );

function arriveWithToken(token = TOKEN) {
  window.history.replaceState(null, "", `/invitations/accept?token=${token}`);
}

let lookupBody: unknown;
beforeEach(() => {
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/invitations/accept");
  document.cookie = "apg_ws=; Path=/; Max-Age=0";
  router.replace.mockReset();
  router.refresh.mockReset();
  toastSuccess.mockReset();
  lookupBody = undefined;
  server.use(
    http.post(LOOKUP, async ({ request }) => {
      lookupBody = await request.json();
      return HttpResponse.json(PREVIEW);
    }),
  );
});

describe("invitation token", () => {
  it("accepts only URL-safe tokens up to 256 characters", () => {
    expect(parseInvitationToken(TOKEN)).toBe(TOKEN);
    expect(parseInvitationToken("<script>")).toBeUndefined();
    expect(parseInvitationToken("a".repeat(257))).toBeUndefined();
    expect(parseInvitationToken("")).toBeUndefined();
  });
});

describe("InvitationFlow — link and preview (AC1, AC2)", () => {
  it("moves the token out of the URL into this tab's storage and shows the invitation", async () => {
    arriveWithToken();
    renderWithProviders(<InvitationFlow urlToken={TOKEN} signedIn={false} />);

    expect(await screen.findByRole("heading", { name: `Join “${globex.name}”` })).toBeInTheDocument();
    expect(window.location.search).toBe("");
    expect(readStoredToken()).toBe(TOKEN);
    expect(lookupBody).toEqual({ token: TOKEN });
    expect(screen.getByText(PREVIEW.email)).toBeInTheDocument();
    expect(screen.getByText("Member")).toBeInTheDocument();
    expect(screen.getByText(/Oct 3, 2026/)).toBeInTheDocument();
  });

  it("shows one message for invalid, expired, used or revoked links (404)", async () => {
    server.use(http.post(LOOKUP, () => problem(404)));
    renderWithProviders(<InvitationFlow urlToken={TOKEN} signedIn={false} />);
    expect(await screen.findByText("This invitation is no longer valid")).toBeInTheDocument();
    expect(screen.getByText(/Ask the person who invited you/)).toBeInTheDocument();
  });

  it("without any token shows the same message", () => {
    renderWithProviders(<InvitationFlow signedIn={false} />);
    expect(screen.getByText("This invitation is no longer valid")).toBeInTheDocument();
  });

  it("renders names from the invitation as text", async () => {
    server.use(
      http.post(LOOKUP, () => HttpResponse.json({ ...PREVIEW, workspaceName: "<img src=x onerror=alert(1)>" })),
    );
    const { container } = renderWithProviders(<InvitationFlow urlToken={TOKEN} signedIn={false} />);
    expect(await screen.findByRole("heading", { name: "Join “<img src=x onerror=alert(1)>”" })).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("InvitationFlow — signed out (AC3)", () => {
  it("offers sign-in with the invited email filled in", async () => {
    renderWithProviders(<InvitationFlow urlToken={TOKEN} signedIn={false} />);
    await screen.findByRole("heading", { name: /Join/ });
    expect(screen.getByRole("button", { name: "I have an account" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Email")).toHaveValue(PREVIEW.email);
  });

  it("creates an account bound to the invitation: fixed email, no workspace name, token sent", async () => {
    let body: Record<string, unknown> | undefined;
    server.use(
      http.post(REGISTER, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ workspaceId: globex.id }, { status: 201 });
      }),
    );
    storeToken(TOKEN);
    renderWithProviders(<InvitationFlow signedIn={false} />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Create an account" }));

    expect(screen.getByLabelText("Work email")).toHaveValue(PREVIEW.email);
    expect(screen.getByLabelText("Work email")).toHaveAttribute("readonly");
    expect(screen.queryByLabelText(/Workspace name/)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Your name"), "New Colleague");
    await user.type(screen.getByLabelText("Password"), "a long enough password");
    await user.type(screen.getByLabelText("Confirm password"), "a long enough password");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    expect(body).toEqual({
      email: PREVIEW.email,
      displayName: "New Colleague",
      password: "a long enough password",
      invitationToken: TOKEN,
    });
    expect(toastSuccess).toHaveBeenCalledWith("Welcome, New Colleague!", {
      description: `You've joined “${globex.name}”.`,
    });
    expect(readStoredToken()).toBeUndefined();
  });

  it("an existing account switches to signing in; an invalid invitation shows the invalid page", async () => {
    server.use(http.post(REGISTER, () => problem(409)));
    renderWithProviders(<InvitationFlow urlToken={TOKEN} signedIn={false} />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Create an account" }));
    await user.type(screen.getByLabelText("Your name"), "Jackie");
    await user.type(screen.getByLabelText("Password"), "a long enough password");
    await user.type(screen.getByLabelText("Confirm password"), "a long enough password");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await user.click(await screen.findByRole("button", { name: "Sign in instead" }));
    expect(screen.getByLabelText("Email")).toHaveValue(PREVIEW.email);

    server.use(http.post(REGISTER, () => problem(404)));
    await user.click(screen.getByRole("button", { name: "Create an account" }));
    await user.type(screen.getByLabelText("Your name"), "Jackie");
    await user.type(screen.getByLabelText("Password"), "a long enough password");
    await user.type(screen.getByLabelText("Confirm password"), "a long enough password");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("This invitation is no longer valid")).toBeInTheDocument();
    expect(readStoredToken()).toBeUndefined();
  });
});

describe("InvitationFlow — signed in (AC4–AC6)", () => {
  it("joins with the invited account, makes it the current workspace and opens the dashboard", async () => {
    let acceptBody: unknown;
    server.use(
      http.post(ACCEPT, async ({ request }) => {
        acceptBody = await request.json();
        return HttpResponse.json({ ...globex, createdAt: "2026-09-01T00:00:00Z" });
      }),
    );
    storeToken(TOKEN);
    renderWithProviders(<InvitationFlow signedIn />);
    await userEvent.setup().click(await screen.findByRole("button", { name: "Join workspace" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    expect(acceptBody).toEqual({ token: TOKEN });
    expect(document.cookie).toContain(`apg_ws=${globex.id}`);
    expect(readStoredToken()).toBeUndefined();
    expect(toastSuccess).toHaveBeenCalledWith(`You've joined “${globex.name}”.`, { description: undefined });
  });

  it("warns when signed in with another email and signs out without leaving the page", async () => {
    let loggedOut = false;
    server.use(
      http.post(LOOKUP, () => HttpResponse.json({ ...PREVIEW, email: "colleague@example.com" })),
      http.post(LOGOUT, () => {
        loggedOut = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderWithProviders(<InvitationFlow urlToken={TOKEN} signedIn />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("This invitation is for a different account.");
    expect(alert).toHaveTextContent("Invited: colleague@example.com");
    expect(alert).toHaveTextContent(`Signed in as: ${TEST_USER.email}`);
    expect(screen.queryByRole("button", { name: "Join workspace" })).not.toBeInTheDocument();

    const replace = vi.fn();
    vi.stubGlobal("location", { ...window.location, replace });
    await userEvent.setup().click(screen.getByRole("button", { name: "Sign out and switch account" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/invitations/accept"));
    vi.unstubAllGlobals();
    expect(loggedOut).toBe(true);
    expect(router.replace).not.toHaveBeenCalled();
    expect(readStoredToken()).toBe(TOKEN);
  });

  it("403 from the API shows the same wrong-account warning", async () => {
    server.use(http.post(ACCEPT, () => problem(403)));
    renderWithProviders(<InvitationFlow urlToken={TOKEN} signedIn />);
    await userEvent.setup().click(await screen.findByRole("button", { name: "Join workspace" }));
    expect(await screen.findByText("This invitation is for a different account.")).toBeInTheDocument();
  });

  it("already a member (409): opens that workspace", async () => {
    server.use(http.post(ACCEPT, () => problem(409)));
    renderWithProviders(<InvitationFlow urlToken={TOKEN} signedIn />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Join workspace" }));
    expect(await screen.findByText(`You're already a member of “${globex.name}”.`)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open workspace" }));
    expect(router.replace).toHaveBeenCalledWith("/");
    expect(document.cookie).toContain(`apg_ws=${globex.id}`);
  });

  it("an invitation that became invalid (404 on join) shows the invalid page", async () => {
    server.use(http.post(ACCEPT, () => problem(404)));
    renderWithProviders(<InvitationFlow urlToken={TOKEN} signedIn />);
    await userEvent.setup().click(await screen.findByRole("button", { name: "Join workspace" }));
    expect(await screen.findByText("This invitation is no longer valid")).toBeInTheDocument();
  });

  it("other failures stay on the page with the trace id", async () => {
    server.use(http.post(ACCEPT, () => problem(500, { traceId: "t-77" })));
    renderWithProviders(<InvitationFlow urlToken={TOKEN} signedIn />);
    await userEvent.setup().click(await screen.findByRole("button", { name: "Join workspace" }));
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Trace ID: t-77")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join workspace" })).toBeEnabled();
  });
});
