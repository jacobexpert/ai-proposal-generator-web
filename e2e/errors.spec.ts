import { expect, test } from "@playwright/test";

import { signIn } from "./helpers";

test.describe("Error pages (US-FE-04)", () => {
  test("unknown page shows the neutral 404 with a way back", async ({ page }) => {
    await signIn(page, "/this-page-does-not-exist");
    await expect(page.getByRole("heading", { name: "Not found or you don't have access" })).toBeVisible();
    await page.getByRole("link", { name: "Go to dashboard" }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
