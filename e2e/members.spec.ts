import { expect, test } from "@playwright/test";

import { signIn } from "./helpers";

test.describe("Members & invitations (US-FE-44)", () => {
  test("an owner invites someone, gets the link once, then revokes the invitation", async ({ page }) => {
    await signIn(page, "/settings");
    await expect(page).toHaveURL(/\/settings\/workspace$/);
    await page.getByRole("navigation", { name: "Settings" }).getByRole("link", { name: "Members" }).click();
    await expect(page).toHaveURL(/\/settings\/members$/);
    await expect(page.getByRole("table", { name: "Workspace members" })).toContainText("Alex Pham");

    await page.getByRole("button", { name: "Invite member" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Email").fill("e2e.invitee@example.com");
    await dialog.getByRole("button", { name: "Create invitation" }).click();
    await expect(dialog.getByLabel("Invitation link")).toHaveValue(/\/invitations\/accept\?token=mock-token-\d+$/);
    await dialog.getByRole("button", { name: "Done" }).click();

    await page.getByRole("tab", { name: /Pending invitations/ }).click();
    const pending = page.getByRole("table", { name: "Pending invitations" });
    await expect(pending).toContainText("e2e.invitee@example.com");
    await expect(pending).not.toContainText("token");

    await pending.getByRole("button", { name: "Revoke invitation for e2e.invitee@example.com" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Revoke" }).click();
    await expect(pending.getByText("e2e.invitee@example.com")).toHaveCount(0);
  });

  test("an owner promotes a member to owner and back", async ({ page }) => {
    await signIn(page, "/settings/members");
    await page.getByRole("button", { name: "Actions for Alex Pham" }).click();
    await page.getByRole("menuitem", { name: "Make owner" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Make owner" }).click();
    await expect(page.getByRole("table", { name: "Workspace members" }).getByText("Owner")).toHaveCount(2);

    await page.getByRole("button", { name: "Actions for Alex Pham" }).click();
    await page.getByRole("menuitem", { name: "Make member" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Make member" }).click();
    await expect(page.getByRole("table", { name: "Workspace members" }).getByText("Owner")).toHaveCount(1);
  });

  test("a member sees the list without owner controls", async ({ page }) => {
    await signIn(page, "/settings/members");
    await page.getByRole("button", { name: /switch workspace/i }).click();
    await page.getByRole("menuitemradio", { name: /Globex Delivery/ }).click();
    await page.goto("/settings/members");
    await expect(page.getByRole("table", { name: "Workspace members" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Invite member" })).toHaveCount(0);
    await expect(page.getByRole("tab")).toHaveCount(0);
  });
});
