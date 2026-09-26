import { expect, type Page } from "@playwright/test";

export const E2E_USER = { email: "jackie@example.com", password: "correct horse battery" };

/** Sign in through the real login page (BFF → mock API). */
export async function signIn(page: Page, path = "/") {
  await page.goto(path);
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Email").fill(E2E_USER.email);
  await page.getByLabel("Password").fill(E2E_USER.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
