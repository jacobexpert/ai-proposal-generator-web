import { expect, test } from "@playwright/test";

import { signIn } from "./helpers";

const PROPOSAL = "3f6c2a1b-8d4e-4f5a-9b6c-7d8e9f0a1b2c";
const DOCUMENTS_PAGE = `/proposals/${PROPOSAL}/documents`;

const file = (name: string, mimeType = "application/pdf") => ({
  name,
  mimeType,
  buffer: Buffer.from("%PDF-1.7 test"),
});

test.describe("Document upload (US-FE-08)", () => {
  test("uploads several files with their categories", async ({ page }) => {
    await signIn(page, DOCUMENTS_PAGE);
    await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible();

    await page.getByTestId("document-file-input").setInputFiles([file("rfp.pdf"), file("minutes.md", "text/markdown")]);
    await page.getByRole("combobox", { name: "Category for minutes.md" }).click();
    await page.getByRole("option", { name: "Meeting note" }).click();
    await page.getByRole("button", { name: "Upload 2 files" }).click();

    const rows = page.getByTestId("upload-row");
    await expect(rows.filter({ hasText: "rfp.pdf" })).toContainText("Uploaded");
    await expect(rows.filter({ hasText: "minutes.md" })).toContainText("Uploaded");
    await expect(page.getByRole("combobox", { name: "Category for minutes.md" })).toContainText("Meeting note");
  });

  test("rejects unsupported files before upload and reports malware from the API", async ({ page }) => {
    await signIn(page, DOCUMENTS_PAGE);
    await page
      .getByTestId("document-file-input")
      .setInputFiles([file("setup.exe", "application/octet-stream"), file("eicar-test.pdf")]);

    const rows = page.getByTestId("upload-row");
    await expect(rows.filter({ hasText: "setup.exe" })).toContainText("Unsupported file type");
    await page.getByRole("button", { name: "Upload" }).click();
    await expect(rows.filter({ hasText: "eicar-test.pdf" })).toContainText("Malware detected");
    await expect(page.getByRole("button", { name: /retry/i })).toHaveCount(0);
  });

  test("shows not found for an invalid proposal id", async ({ page }) => {
    await signIn(page, "/proposals/not-a-uuid/documents");
    await expect(page.getByText(/not found/i).first()).toBeVisible();
  });
});
