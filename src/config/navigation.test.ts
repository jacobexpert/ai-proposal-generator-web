import { describe, expect, it } from "vitest";

import { NAV_ITEMS, getBreadcrumbs, isNavItemActive, visibleNavItems } from "./navigation";

describe("navigation", () => {
  it("shows Dashboard, Proposals and Settings, and hides Knowledge until Phase 2", () => {
    expect(visibleNavItems().map((i) => i.label)).toEqual(["Dashboard", "Proposals", "Settings"]);
    expect(NAV_ITEMS.find((i) => i.label === "Knowledge")?.enabled).toBe(false);
  });

  it("matches the root item only on exact path and other items on sub-routes", () => {
    expect(isNavItemActive("/", "/")).toBe(true);
    expect(isNavItemActive("/proposals", "/")).toBe(false);
    expect(isNavItemActive("/proposals/123/requirements", "/proposals")).toBe(true);
    expect(isNavItemActive("/proposals-archive", "/proposals")).toBe(false);
  });

  it("builds breadcrumbs for known routes and skips unknown segments", () => {
    expect(getBreadcrumbs("/")).toEqual([{ label: "Dashboard", href: "/" }]);
    expect(getBreadcrumbs("/settings/members").map((c) => c.label)).toEqual(["Dashboard", "Settings", "Members"]);
    expect(getBreadcrumbs("/proposals/0b6f/requirements").map((c) => c.label)).toEqual(["Dashboard", "Proposals"]);
  });
});
