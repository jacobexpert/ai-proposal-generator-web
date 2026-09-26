import { expect, test } from "@playwright/test";

import { E2E_USER, signIn } from "./helpers";

test.describe("Authentication (US-FE-02)", () => {
  test("redirects to /login and returns to the requested page after signing in", async ({ page }) => {
    await page.goto("/proposals?view=all");
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fproposals%3Fview%3Dall$/);

    await page.getByLabel("Email").fill(E2E_USER.email);
    await page.getByLabel("Password").fill("wrong password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator("#login-form-error")).toHaveText("Incorrect email or password.");

    await page.getByLabel("Password").fill(E2E_USER.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/proposals\?view=all$/);
    await expect(page.getByRole("heading", { level: 1, name: "Proposals" })).toBeVisible();
  });

  test("keeps tokens out of JavaScript and browser storage", async ({ page, context }) => {
    await signIn(page);
    const cookies = await context.cookies();
    const at = cookies.find((c) => c.name === "apg_at");
    const rt = cookies.find((c) => c.name === "apg_rt");
    expect(at?.httpOnly && rt?.httpOnly).toBe(true);
    expect(at?.sameSite).toBe("Lax");

    const visible = await page.evaluate(() => ({
      cookie: document.cookie,
      local: JSON.stringify(localStorage),
      session: JSON.stringify(sessionStorage),
    }));
    expect(visible.cookie).not.toContain("apg_");
    expect(visible.local + visible.session).not.toMatch(/access-|refresh-/);
  });

  test("ignores an external returnUrl (no open redirect)", async ({ page }) => {
    await page.goto("/login?returnUrl=https://evil.example.com");
    await page.getByLabel("Email").fill(E2E_USER.email);
    await page.getByLabel("Password").fill(E2E_USER.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/");
  });

  test("signs out and protects pages again", async ({ page }) => {
    await signIn(page, "/settings");
    await page.getByRole("button", { name: "Open user menu" }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/settings");
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fsettings$/);
  });

  test("renews an expired access cookie on page load", async ({ page, context }) => {
    await signIn(page, "/proposals");
    await context.clearCookies({ name: "apg_at" });
    await page.reload();
    await expect(page).toHaveURL(/\/proposals$/);
    expect((await context.cookies()).some((c) => c.name === "apg_at")).toBe(true);
  });
});
