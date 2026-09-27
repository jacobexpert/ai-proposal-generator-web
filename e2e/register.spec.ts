import { expect, test } from "@playwright/test";

import { E2E_USER } from "./helpers";

async function fillForm(page: import("@playwright/test").Page, email: string) {
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Your name").fill("Jackie Tran");
  await page.getByLabel("Password", { exact: true }).fill("a long enough password");
  await page.getByLabel("Confirm password").fill("a long enough password");
  await page.getByRole("button", { name: "Create account" }).click();
}

test.describe("Sign-up (US-FE-42)", () => {
  test("creates an account and lands in the new workspace, signed in", async ({ page, context }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Create an account" }).click();
    await expect(page).toHaveURL(/\/register$/);

    await fillForm(page, "new.person@example.com");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText("Welcome, Jackie Tran!")).toBeVisible();
    await expect(page.getByRole("button", { name: /switch workspace/i })).toContainText("Globex Delivery");

    const cookies = await context.cookies();
    expect(cookies.find((c) => c.name === "apg_at")?.httpOnly).toBe(true);
    expect(await page.evaluate(() => document.cookie)).not.toContain("apg_at");
  });

  test("an existing email offers to sign in instead", async ({ page }) => {
    await page.goto("/register");
    await fillForm(page, E2E_USER.email);
    await expect(page.getByText("An account with this email already exists.")).toBeVisible();
    await page.getByRole("link", { name: "Sign in instead" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("signed-in users are sent from /register to the dashboard", async ({ page }) => {
    await page.goto("/register");
    await fillForm(page, "someone.else@example.com");
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/register");
    await expect(page).toHaveURL(/\/$/);
  });
});
