import { expect, test } from "@playwright/test";

import { E2E_USER, signIn } from "./helpers";

const GLOBEX = "Globex Delivery";

test.describe("Invitation link (US-FE-43)", () => {
  test("signed out: shows the invitation, hides the token, signs in and joins", async ({ page }) => {
    await page.goto("/invitations/accept?token=invite-for-jackie");
    await expect(page.getByRole("heading", { name: `Join “${GLOBEX}”` })).toBeVisible();
    await expect(page).toHaveURL(/\/invitations\/accept$/); // token removed from the address bar

    await expect(page.getByLabel("Email")).toHaveValue(E2E_USER.email);
    await page.getByLabel("Password").fill(E2E_USER.password);
    await page.getByRole("button", { name: "Sign in" }).click();

    // Back on the same page, signed in, token still known to this tab — and still not in the URL.
    const join = page.getByRole("button", { name: "Join workspace" });
    await expect(join).toBeVisible();
    await expect(page).toHaveURL(/\/invitations\/accept$/);
    await join.click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(`You've joined “${GLOBEX}”.`)).toBeVisible();
    await expect(page.getByRole("button", { name: /switch workspace/i })).toContainText(GLOBEX);
  });

  test("signed in with another account: explains and offers to switch", async ({ page }) => {
    await signIn(page);
    await page.goto("/invitations/accept?token=invite-for-colleague");
    await expect(page.getByText("This invitation is for a different account.")).toBeVisible();
    await page.getByRole("button", { name: "Sign out and switch account" }).click();
    await expect(page.getByRole("button", { name: "I have an account" })).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveValue("colleague@example.com");
    await expect(page).toHaveURL(/\/invitations\/accept$/);
  });

  test("an invalid link says so", async ({ page }) => {
    await page.goto("/invitations/accept?token=nope");
    await expect(page.getByText("This invitation is no longer valid")).toBeVisible();
  });
});
