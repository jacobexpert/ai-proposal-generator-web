import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";

import { DocumentUploader, type DocumentUploaderProps } from "./document-uploader";
import { FakeXhr, TEST_PROPOSAL_ID } from "./test-utils";

const redirect = vi.hoisted(() => vi.fn((error: unknown) => (error as { status?: number })?.status === 401));
vi.mock("@/app/providers", () => ({ redirectToLoginOnUnauthorized: redirect }));

const WS = "0f5e7b1c-3a2d-4c8e-9b6f-1a2b3c4d5e6f";

const pdf = (name = "rfp.pdf", size = 2048) => new File([new Uint8Array(size)], name, { type: "application/pdf" });

function setup(props: Partial<DocumentUploaderProps> = {}) {
  const onUploaded = vi.fn();
  const onDocumentsChanged = vi.fn();
  const user = userEvent.setup({ applyAccept: false });
  const view = renderWithProviders(
    <DocumentUploader
      workspaceId={WS}
      proposalId={TEST_PROPOSAL_ID}
      onUploaded={onUploaded}
      onDocumentsChanged={onDocumentsChanged}
      {...props}
    />,
  );
  const input = screen.getByTestId("document-file-input") as HTMLInputElement;
  const choose = (...files: File[]) => user.upload(input, files);
  const rows = () => screen.queryAllByTestId("upload-row");
  const row = (name: string) => rows().find((r) => within(r).queryByText(name))!;
  return { ...view, user, choose, rows, row, onUploaded, onDocumentsChanged };
}

const requests = () => FakeXhr.requests;
const respond = (fn: () => void) => act(async () => fn());

beforeEach(() => {
  FakeXhr.reset();
  redirect.mockClear();
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
});
afterEach(() => vi.unstubAllGlobals());

describe("DocumentUploader", () => {
  it("lists chosen files with their size and the default category, without uploading yet", async () => {
    const { choose, rows } = setup();
    expect(screen.getByText("PDF, DOCX, TXT or MD, up to 25 MB each")).toBeInTheDocument();

    await choose(pdf("rfp.pdf", 2048), pdf("annex.pdf", 10));

    expect(rows()).toHaveLength(2);
    expect(screen.getByText("2 KB")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Category for rfp.pdf" })).toHaveTextContent("RFP");
    expect(screen.getByRole("button", { name: "Upload 2 files" })).toBeEnabled();
    expect(requests()).toHaveLength(0);
  });

  it("flags files that fail the client checks and never sends them", async () => {
    const { choose, row, user } = setup();
    await choose(new File(["MZ"], "setup.exe"), new File([], "empty.pdf"));

    expect(within(row("setup.exe")).getByText(/unsupported file type/i)).toBeInTheDocument();
    expect(within(row("empty.pdf")).getByText("The file is empty.")).toBeInTheDocument();
    expect(within(row("setup.exe")).queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
    const upload = screen.getByRole("button", { name: "Upload" });
    expect(upload).toBeDisabled();
    await user.click(upload);
    expect(requests()).toHaveLength(0);
  });

  it("renders a malicious file name as plain text", async () => {
    const name = '<img src=x onerror="window.__xss=1">.pdf';
    const { choose, container } = setup();
    await choose(pdf(name));
    expect(screen.getByText(name)).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
    expect((window as { __xss?: number }).__xss).toBeUndefined();
  });

  it("uploads with progress, then reports success to the caller", async () => {
    const { choose, user, row, onUploaded, onDocumentsChanged } = setup();
    await choose(pdf());
    await user.click(screen.getByRole("button", { name: "Upload" }));

    expect(requests()).toHaveLength(1);
    expect(requests()[0].category).toBe("RFP");
    await respond(() => requests()[0].progress(50, 100));
    expect(screen.getByRole("progressbar", { name: "Uploading rfp.pdf" })).toHaveAttribute("aria-valuenow", "50");
    expect(within(row("rfp.pdf")).getByText("50%")).toBeInTheDocument();

    await respond(() => requests()[0].succeed());
    expect(within(row("rfp.pdf")).getByText("Uploaded")).toBeInTheDocument();
    expect(onUploaded).toHaveBeenCalledWith(expect.objectContaining({ fileName: "rfp.pdf", category: "RFP" }));
    expect(onDocumentsChanged).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("combobox", { name: "Category for rfp.pdf" })).toHaveAttribute("data-disabled");
  });

  it("uses the default category given by the caller (Company Knowledge step)", async () => {
    const { choose, user } = setup({ defaultCategory: "COMPANY_PROFILE" });
    await choose(pdf("profile.pdf"));
    expect(screen.getByRole("combobox", { name: "Category for profile.pdf" })).toHaveTextContent("Company profile");
    await user.click(screen.getByRole("button", { name: "Upload" }));
    expect(requests()[0].category).toBe("COMPANY_PROFILE");
  });

  it("lets the user pick a category per file", async () => {
    const { choose, user } = setup();
    await choose(pdf("minutes.pdf"));
    await user.click(screen.getByRole("combobox", { name: "Category for minutes.pdf" }));
    await user.click(await screen.findByRole("option", { name: "Meeting note" }));
    expect(screen.getByRole("combobox", { name: "Category for minutes.pdf" })).toHaveTextContent("Meeting note");
    await user.click(screen.getByRole("button", { name: "Upload" }));
    expect(requests()[0].category).toBe("MEETING_NOTE");
  });

  it("offers Retry after a 503 and succeeds on the second attempt", async () => {
    const { choose, user, row } = setup();
    await choose(pdf());
    await user.click(screen.getByRole("button", { name: "Upload" }));
    await respond(() => requests()[0].problem(503, { traceId: "trace-503" }));

    expect(within(row("rfp.pdf")).getByText(/temporarily unavailable/i)).toBeInTheDocument();
    expect(within(row("rfp.pdf")).getByText("Trace ID: trace-503")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry upload of rfp.pdf" }));

    expect(requests()).toHaveLength(2);
    await respond(() => requests()[1].succeed());
    expect(within(row("rfp.pdf")).getByText("Uploaded")).toBeInTheDocument();
  });

  it("reports malware (422) without Retry and refreshes the document list", async () => {
    const { choose, user, row, onUploaded, onDocumentsChanged } = setup();
    await choose(pdf("eicar.pdf"));
    await user.click(screen.getByRole("button", { name: "Upload" }));
    await respond(() => requests()[0].problem(422, { documentId: "d-1" }));

    expect(within(row("eicar.pdf")).getByText(/malware detected/i)).toBeInTheDocument();
    expect(within(row("eicar.pdf")).queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
    expect(onUploaded).not.toHaveBeenCalled();
    expect(onDocumentsChanged).toHaveBeenCalledTimes(1);
  });

  it.each([
    [409, { detail: "Documents can't be added while the proposal is ANALYZING." }, /while the proposal is ANALYZING/],
    [413, {}, /larger than 25 MB/],
    [415, {}, /content must be PDF, DOCX, TXT or MD/],
    [404, {}, /not found, or you don't have access/i],
  ])("shows a specific message for %d and no Retry", async (status, extra, message) => {
    const { choose, user, row, onDocumentsChanged } = setup();
    await choose(pdf());
    await user.click(screen.getByRole("button", { name: "Upload" }));
    await respond(() => requests()[0].problem(status, extra));

    expect(within(row("rfp.pdf")).getByText(message)).toBeInTheDocument();
    expect(within(row("rfp.pdf")).getByText("Failed")).toBeInTheDocument();
    expect(within(row("rfp.pdf")).queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
    expect(onDocumentsChanged).not.toHaveBeenCalled();
  });

  it("cancels an upload in flight and allows sending it again", async () => {
    const { choose, user, row } = setup();
    await choose(pdf());
    await user.click(screen.getByRole("button", { name: "Upload" }));
    await user.click(screen.getByRole("button", { name: "Cancel upload of rfp.pdf" }));

    expect(requests()[0].aborted).toBe(true);
    expect(within(row("rfp.pdf")).getByText("Cancelled")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry upload of rfp.pdf" }));
    expect(requests()).toHaveLength(2);
  });

  it("runs at most two uploads at a time", async () => {
    const { choose, user } = setup();
    await choose(pdf("a.pdf"), pdf("b.pdf"), pdf("c.pdf"));
    await user.click(screen.getByRole("button", { name: "Upload 3 files" }));

    expect(requests().map((r) => r.file?.name)).toEqual(["a.pdf", "b.pdf"]);
    await respond(() => requests()[0].succeed());
    expect(requests().map((r) => r.file?.name)).toEqual(["a.pdf", "b.pdf", "c.pdf"]);
  });

  it("sends the user to sign in when the session has ended (401)", async () => {
    const { choose, user } = setup();
    await choose(pdf());
    await user.click(screen.getByRole("button", { name: "Upload" }));
    await respond(() => requests()[0].problem(401));
    expect(redirect).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });

  it("accepts files dropped on the drop zone", async () => {
    const { rows } = setup();
    const zone = screen.getByTestId("document-dropzone");
    fireEvent.dragEnter(zone, { dataTransfer: { files: [], dropEffect: "none" } });
    expect(zone).toHaveAttribute("data-dragging");
    fireEvent.drop(zone, { dataTransfer: { files: [pdf("dropped.pdf")] } });
    expect(zone).not.toHaveAttribute("data-dragging");
    expect(rows()).toHaveLength(1);
    expect(screen.getByText("dropped.pdf")).toBeInTheDocument();
  });

  it("removes a file and clears uploaded ones", async () => {
    const { choose, user, rows } = setup();
    await choose(pdf("a.pdf"), pdf("b.pdf"));
    await user.click(screen.getByRole("button", { name: "Remove b.pdf" }));
    expect(rows()).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Upload" }));
    await respond(() => requests()[0].succeed());
    await user.click(screen.getByRole("button", { name: "Clear uploaded" }));
    expect(rows()).toHaveLength(0);
  });
});
