import { expect, test } from "@playwright/test";

import { signIn } from "./helpers";

test.describe("App shell", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("navigates between the main sections", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();

    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link")).toHaveText(["Dashboard", "Proposals", "Settings"]);

    await nav.getByRole("link", { name: "Proposals" }).click();
    await expect(page).toHaveURL(/\/proposals$/);
    await expect(page.getByRole("heading", { level: 1, name: "Proposals" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Proposals" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Dashboard");
  });

  test("keeps the active item readable after a mouse click (brand text on brand wash)", async ({ page }) => {
    await page.goto("/proposals");
    const dashboard = page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Dashboard" });
    await dashboard.click();
    await expect(dashboard).toHaveAttribute("aria-current", "page");
    await expect(dashboard).toHaveCSS("color", "rgb(0, 82, 255)");
  });

  test("collapses the sidebar and keeps the choice after reload", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
  });

  test("offers a skip link to the main content", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  });

  test("shows backend health on the developer page", async ({ page }) => {
    await page.goto("/dev/health");
    await expect(page.getByRole("heading", { level: 1, name: "System health" })).toBeVisible();
    await expect(page.getByText("db")).toBeVisible();
  });
});
