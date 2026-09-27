import { expect, test } from "@playwright/test";

import { signIn } from "./helpers";

test.describe("Proposals (US-FE-05, 06, 07)", () => {
  test("create a proposal with the wizard, find it on the dashboard, open it", async ({ page }) => {
    const name = `Wizard proposal ${Date.now()}`;
    await signIn(page, "/proposals/new");

    await page.getByLabel("Proposal name").fill(name);
    await page.getByLabel("Customer name").fill("Contoso Bank");
    await page.getByLabel("Customer industry").fill("Banking");
    await page.getByLabel("Opportunity description").fill("Move the core platform to Azure.");
    await page.getByLabel("Deadline").fill("2030-01-15");
    await page.getByLabel("Template").selectOption({ label: "Standard IT proposal (2 sections)" });
    await page.getByRole("button", { name: "Create and continue" }).click();

    await expect(page).toHaveURL(/proposalId=.+&step=2$/);
    await expect(page.getByRole("heading", { name: "Customer documents" })).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Company knowledge" })).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Input required", { exact: true })).toBeVisible(); // template sections
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("button", { name: /Analyze documents/ })).toBeDisabled();

    // Leaving and coming back keeps the draft (AC4) — it is on the dashboard.
    await page.goto(`/?q=${encodeURIComponent(name)}`);
    const row = page.getByRole("row", { name: new RegExp(name) });
    await expect(row).toContainText("Draft");
    await row.getByRole("link", { name }).click();

    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page.getByRole("list", { name: "Proposal progress" })).toBeVisible();
    const tabs = page.getByRole("navigation", { name: "Proposal sections" });
    await expect(tabs.getByRole("link", { name: "Documents" })).toBeVisible();
    await expect(tabs.getByRole("link", { name: /Requirements/ })).toHaveAttribute("aria-disabled", "true");
  });

  test("edit the details, then delete the draft", async ({ page }) => {
    const name = `Edit proposal ${Date.now()}`;
    await signIn(page, "/proposals/new");
    await page.getByLabel("Proposal name").fill(name);
    await page.getByLabel("Customer name").fill("Fabrikam");
    await page.getByLabel("Customer industry").fill("Retail");
    await page.getByLabel("Opportunity description").fill("E-commerce replatform.");
    await page.getByLabel("Deadline").fill("2030-02-01");
    await page.getByLabel("Template").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Create and continue" }).click();
    await expect(page).toHaveURL(/step=2$/);
    const id = new URL(page.url()).searchParams.get("proposalId");

    await page.goto(`/proposals/${id}`);
    await page.getByRole("button", { name: "Edit details" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Sales owner (optional)").fill("Minh Tran");
    await dialog.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("region", { name: "Details" })).toContainText("Minh Tran");

    await page.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("menuitem", { name: "Delete draft" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete draft" }).click();
    await expect(page).toHaveURL(/\/proposals$/);
    await page.goto(`/proposals?q=${encodeURIComponent(name)}`);
    await expect(page.getByText("No proposals match")).toBeVisible();
  });

  test("settings: General shows the workspace, members cannot rename", async ({ page }) => {
    await signIn(page, "/settings");
    await expect(page.getByRole("region", { name: "Workspace", exact: true })).toContainText("Owner");
    await expect(page.getByLabel("Name")).toHaveValue("Acme Consulting");
    await page.getByRole("button", { name: /switch workspace/i }).click();
    await page.getByRole("menuitemradio", { name: /Globex Delivery/ }).click();
    await page.goto("/settings/workspace");
    await expect(page.getByText("Only owners can rename the workspace.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Leave workspace" })).toBeVisible();
  });
});
