import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { server } from "@/mocks/server";
import { renderWithProviders as render } from "@/test/render";

import { AppShell } from "./app-shell";
import { resetSidebarPreference } from "./use-sidebar-collapsed";

const pathname = vi.hoisted(() => ({ value: "/proposals" }));
const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value, useRouter: () => router }));

describe("AppShell", () => {
  beforeEach(() => {
    pathname.value = "/proposals";
    window.localStorage.clear();
    resetSidebarPreference();
  });

  it("renders the main navigation without the Phase 2 Knowledge item", () => {
    render(<AppShell>content</AppShell>);
    const nav = screen.getByRole("navigation", { name: "Main" });
    const links = within(nav)
      .getAllByRole("link")
      .map((l) => l.textContent);
    expect(links).toEqual(["Dashboard", "Proposals", "Settings"]);
    expect(within(nav).queryByText("Knowledge")).not.toBeInTheDocument();
  });

  it("marks the current section as the active page", () => {
    pathname.value = "/proposals/42";
    render(<AppShell>content</AppShell>);
    expect(screen.getByRole("link", { name: "Proposals" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("renders the top bar controls and the content area", () => {
    render(<AppShell>page body</AppShell>);
    expect(screen.getByRole("button", { name: "Switch workspace" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open user menu" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("page body");
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#main-content");
  });

  it("collapses the sidebar, keeps links accessible by name and remembers the choice", async () => {
    const user = userEvent.setup();
    render(<AppShell>content</AppShell>);
    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));

    expect(screen.getByRole("button", { name: "Expand sidebar" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
    expect(window.localStorage.getItem("apg.sidebar-collapsed")).toBe("1");
  });

  it("restores a collapsed sidebar from the stored preference", async () => {
    window.localStorage.setItem("apg.sidebar-collapsed", "1");
    render(<AppShell>content</AppShell>);
    expect(await screen.findByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
  });

  it("shows developer tools only when enabled", () => {
    const { rerender } = render(<AppShell>content</AppShell>);
    expect(screen.queryByRole("link", { name: "System health" })).not.toBeInTheDocument();
    rerender(<AppShell showDevTools>content</AppShell>);
    expect(screen.getByRole("link", { name: "System health" })).toBeInTheDocument();
  });

  it("signs out: calls the BFF, clears cached data and returns to /login", async () => {
    let called = false;
    server.use(
      http.post("http://localhost:3000/api/auth/logout", () => {
        called = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    const { client } = render(<AppShell>content</AppShell>);
    client.setQueryData(["me"], { email: "jackie@example.com" });

    await user.click(screen.getByRole("button", { name: "Open user menu" }));
    await user.click(await screen.findByRole("menuitem", { name: "Sign out" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(called).toBe(true);
    expect(client.getQueryData(["me"])).toBeUndefined();
  });
});
