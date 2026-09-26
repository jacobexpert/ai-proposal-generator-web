import { expect, test } from "@playwright/test";

import { E2E_USER, signIn } from "./helpers";

const ACME = "Acme Consulting";
const GLOBEX = "Globex Delivery";

test.describe("Workspaces (US-FE-03)", () => {
  test("starts in the first workspace, switches, and keeps the choice after reload", async ({ page }) => {
    await signIn(page, "/proposals");
    const switcher = page.getByRole("button", { name: /switch workspace/i });
    await expect(switcher).toContainText(ACME);

    await switcher.click();
    await page.getByRole("menuitemradio", { name: new RegExp(GLOBEX) }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(switcher).toContainText(GLOBEX);

    await page.reload();
    await expect(page.getByRole("button", { name: /switch workspace/i })).toContainText(GLOBEX);
  });

  test("shows the user in the menu and on the profile page", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: "Open user menu" }).click();
    const menu = page.getByRole("menu");
    await expect(menu).toContainText("Jackie Tran");
    await expect(menu).toContainText(E2E_USER.email);
    await expect(menu).toContainText(`${ACME} · Owner`);

    await menu.getByRole("menuitem", { name: "Profile" }).click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole("heading", { level: 1, name: "Profile" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Workspaces" })).toContainText(GLOBEX);
  });

  test("forgets the workspace on sign-out", async ({ page, context }) => {
    await signIn(page);
    await page.getByRole("button", { name: /switch workspace/i }).click();
    await page.getByRole("menuitemradio", { name: new RegExp(GLOBEX) }).click();
    await expect(page.getByRole("button", { name: /switch workspace/i })).toContainText(GLOBEX);

    await page.getByRole("button", { name: "Open user menu" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
    expect((await context.cookies()).find((c) => c.name === "apg_ws")).toBeUndefined();
  });
});
