import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppTopbar, initials } from "@/components/layout/app-topbar";
import { apiFetch } from "@/lib/api/client";
import { BFF_BASE_URL, TEST_USER, TEST_WORKSPACES } from "@/mocks/handlers";
import { server } from "@/mocks/server";

import { ProfileDetails } from "./profile-details";
import { workspaceHeader, workspaceKey, workspaceOfKey } from "./query-keys";
import { resolveWorkspace } from "./resolve-workspace";
import { parseWorkspaceId, WORKSPACE_COOKIE } from "./workspace-cookie";
import { useCurrentWorkspace, WorkspaceProvider } from "./workspace-context";
import { WorkspaceGate } from "./workspace-gate";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/" }));

const { toastWarning } = vi.hoisted(() => ({ toastWarning: vi.fn() }));
vi.mock("sonner", async (orig) => {
  const actual = await orig<typeof import("sonner")>();
  return { ...actual, toast: Object.assign(vi.fn(), actual.toast, { warning: toastWarning }) };
});

const { acme, globex } = TEST_WORKSPACES;

function clearCookie() {
  document.cookie = `${WORKSPACE_COOKIE}=; Path=/; Max-Age=0`;
}
const cookieValue = () => document.cookie.match(new RegExp(`${WORKSPACE_COOKIE}=([^;]+)`))?.[1];

/** A workspace-scoped page: shows the workspace it would send in X-Workspace-Id. */
function ScopedPage({ path = "/api/workspaces/current" }: { path?: string }) {
  const ws = useCurrentWorkspace();
  const q = useQuery({
    queryKey: workspaceKey(ws.id, "probe"),
    queryFn: () => apiFetch<{ name: string }>(path, { headers: workspaceHeader(ws.id) }),
    retry: false,
  });
  return <p data-testid="page">{q.isError ? `error:${ws.id}` : `page:${ws.id}`}</p>;
}

function setup(ui: ReactNode, initialWorkspaceId?: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={client}>
      <WorkspaceProvider initialWorkspaceId={initialWorkspaceId}>
        <AppTopbar />
        <WorkspaceGate>{ui}</WorkspaceGate>
      </WorkspaceProvider>
    </QueryClientProvider>,
  );
  return { client, ...utils };
}

const switcher = () => screen.findByRole("button", { name: /switch workspace/i });

beforeEach(() => {
  server.use(http.get(`${BFF_BASE_URL}/api/workspaces/current`, () => HttpResponse.json(acme)));
  clearCookie();
  router.push.mockClear();
  toastWarning.mockClear();
});

describe("helpers", () => {
  it("accepts only UUIDs as a remembered workspace", () => {
    expect(parseWorkspaceId(acme.id.toUpperCase())).toBe(acme.id);
    expect(parseWorkspaceId("../../etc")).toBeUndefined();
    expect(parseWorkspaceId(undefined)).toBeUndefined();
  });

  it("keeps the selected workspace or falls back to the first", () => {
    const list = [acme, globex];
    expect(resolveWorkspace(list, globex.id)).toBe(globex);
    expect(resolveWorkspace(list, "gone")).toBe(acme);
    expect(resolveWorkspace([], acme.id)).toBeUndefined();
  });

  it("scopes query keys by workspace", () => {
    expect(workspaceOfKey(workspaceKey(acme.id, "proposals"))).toBe(acme.id);
    expect(workspaceOfKey(["me"])).toBeUndefined();
  });

  it("builds avatar initials", () => {
    expect(initials("Jackie Tran")).toBe("JT");
    expect(initials("jackie")).toBe("J");
    expect(initials("  ")).toBe("");
  });
});

describe("workspace switcher and user menu (AC1, AC2)", () => {
  it("shows the current workspace, the user and their role", async () => {
    const user = userEvent.setup();
    setup(<ScopedPage />);
    expect(await switcher()).toHaveTextContent(acme.name);

    await user.click(screen.getByRole("button", { name: "Open user menu" }));
    const menu = await screen.findByRole("menu");
    expect(menu).toHaveTextContent(TEST_USER.displayName);
    expect(menu).toHaveTextContent(TEST_USER.email);
    expect(menu).toHaveTextContent(`${acme.name} · Owner`);
    expect(within(menu).getByRole("menuitem", { name: "Profile" })).toHaveAttribute("href", "/profile");
  });

  it("lists workspaces with roles and switches: new header, cache dropped, cookie saved, dashboard", async () => {
    const user = userEvent.setup();
    const { client } = setup(<ScopedPage />);
    expect(await screen.findByTestId("page")).toHaveTextContent(`page:${acme.id}`);
    client.setQueryData(workspaceKey(acme.id, "proposals"), ["cached"]);

    await user.click(await switcher());
    const items = await screen.findAllByRole("menuitemradio");
    expect(items.map((i) => i.textContent)).toEqual([`${acme.name}Owner`, `${globex.name}Member`]);
    expect(items[0]).toHaveAttribute("aria-checked", "true");
    await user.click(items[1]!);

    await waitFor(() => expect(screen.getByTestId("page")).toHaveTextContent(`page:${globex.id}`));
    expect(await switcher()).toHaveTextContent(globex.name);
    expect(client.getQueryData(workspaceKey(acme.id, "proposals"))).toBeUndefined();
    expect(cookieValue()).toBe(globex.id);
    expect(router.push).toHaveBeenCalledWith("/");
    expect(toastWarning).not.toHaveBeenCalled();
  });

  it("sends X-Workspace-Id of the current workspace", async () => {
    let header: string | null = null;
    server.use(
      http.get(`${BFF_BASE_URL}/api/workspaces/current`, ({ request }) => {
        header = request.headers.get("X-Workspace-Id");
        return HttpResponse.json(globex);
      }),
    );
    setup(<ScopedPage />, globex.id);
    await waitFor(() => expect(header).toBe(globex.id));
  });
});

describe("remembered workspace (AC3, AC5)", () => {
  it("restores the remembered workspace after a reload", async () => {
    setup(<ScopedPage />, globex.id);
    expect(await switcher()).toHaveTextContent(globex.name);
    expect(toastWarning).not.toHaveBeenCalled();
  });

  it("first sign-in picks the first workspace silently and remembers it", async () => {
    setup(<ScopedPage />);
    expect(await switcher()).toHaveTextContent(acme.name);
    await waitFor(() => expect(cookieValue()).toBe(acme.id));
    expect(toastWarning).not.toHaveBeenCalled();
  });

  it("a remembered workspace the user left falls back to the first one with a notice", async () => {
    setup(<ScopedPage />, "99999999-9999-4999-8999-999999999999");
    expect(await switcher()).toHaveTextContent(acme.name);
    await waitFor(() =>
      expect(toastWarning).toHaveBeenCalledWith("Your last workspace is no longer available", {
        description: `Switched to “${acme.name}”.`,
      }),
    );
  });
});

describe("losing access (AC4)", () => {
  it("a 404 in the current workspace re-checks membership and moves to the remaining one", async () => {
    const { client } = setup(<ScopedPage />, acme.id);
    expect(await screen.findByTestId("page")).toHaveTextContent(`page:${acme.id}`);

    // The owner removed the user from Acme: its requests now 404 and /api/me no longer lists it.
    server.use(
      http.get(`${BFF_BASE_URL}/api/workspaces/current`, ({ request }) =>
        request.headers.get("X-Workspace-Id") === acme.id
          ? HttpResponse.json({ status: 404, title: "Not Found" }, { status: 404 })
          : HttpResponse.json(globex),
      ),
      http.get(`${BFF_BASE_URL}/api/me`, () => HttpResponse.json({ ...TEST_USER, workspaces: [globex] })),
    );
    await client.refetchQueries({ queryKey: workspaceKey(acme.id, "probe") });

    await waitFor(() =>
      expect(toastWarning).toHaveBeenCalledWith(`You no longer have access to “${acme.name}”`, {
        description: `Switched to “${globex.name}”.`,
      }),
    );
    expect(await switcher()).toHaveTextContent(globex.name);
    expect(screen.getByTestId("page")).toHaveTextContent(`page:${globex.id}`);
    expect(router.push).toHaveBeenCalledWith("/");
    expect(cookieValue()).toBe(globex.id);
  });

  it("a 404 for another reason (e.g. a deleted proposal) keeps the workspace", async () => {
    let meCalls = 0;
    server.use(
      http.get(`${BFF_BASE_URL}/api/me`, () => {
        meCalls += 1;
        return HttpResponse.json(TEST_USER);
      }),
      http.get(`${BFF_BASE_URL}/api/proposals/x`, () => HttpResponse.json({ status: 404 }, { status: 404 })),
    );
    setup(<ScopedPage path="/api/proposals/x" />, acme.id);
    await waitFor(() => expect(screen.getByTestId("page")).toHaveTextContent(`error:${acme.id}`));
    await waitFor(() => expect(meCalls).toBe(2)); // re-checked once
    expect(await switcher()).toHaveTextContent(acme.name);
    expect(toastWarning).not.toHaveBeenCalled();
  });

  it("with no workspace left, explains how to join one", async () => {
    server.use(http.get(`${BFF_BASE_URL}/api/me`, () => HttpResponse.json({ ...TEST_USER, workspaces: [] })));
    setup(<ScopedPage />, acme.id);
    expect(await screen.findByText("You're not a member of any workspace yet")).toBeInTheDocument();
    expect(screen.queryByTestId("page")).not.toBeInTheDocument();
  });
});

describe("loading /api/me", () => {
  it("shows an error with retry when it fails", async () => {
    server.use(
      http.get(`${BFF_BASE_URL}/api/me`, () =>
        HttpResponse.json({ status: 500, title: "Internal Server Error", traceId: "t-9" }, { status: 500 }),
      ),
    );
    setup(<ScopedPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Trace ID: t-9");
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("rejects a malformed response instead of rendering it", async () => {
    server.use(
      http.get(`${BFF_BASE_URL}/api/me`, () =>
        HttpResponse.json({ ...TEST_USER, workspaces: [{ id: "not-a-uuid", name: "x", role: "ADMIN" }] }),
      ),
    );
    setup(<ScopedPage />);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByTestId("page")).not.toBeInTheDocument();
  });
});

describe("ProfileDetails (AC1)", () => {
  it("shows the account and marks the current workspace", async () => {
    setup(<ProfileDetails />, globex.id);
    const account = await screen.findByRole("region", { name: "Account" });
    expect(account).toHaveTextContent(TEST_USER.displayName);
    expect(account).toHaveTextContent(TEST_USER.email);
    const rows = within(screen.getByRole("region", { name: "Workspaces" }))
      .getAllByRole("row")
      .slice(1);
    expect(rows.map((r) => r.textContent)).toEqual([`${acme.name}Owner`, `${globex.name}MemberCurrent`]);
  });

  it("renders names as text, never as HTML", async () => {
    server.use(
      http.get(`${BFF_BASE_URL}/api/me`, () =>
        HttpResponse.json({ ...TEST_USER, displayName: "<img src=x onerror=alert(1)>" }),
      ),
    );
    const { container } = setup(<ProfileDetails />);
    expect(await screen.findByText("<img src=x onerror=alert(1)>", { selector: "dd" })).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });
});
