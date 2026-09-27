import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, NetworkError } from "@/lib/api/client";

import { FakeXhr, TEST_PROPOSAL_ID } from "./test-utils";
import { uploadDocument } from "./upload";

const WS = "0f5e7b1c-3a2d-4c8e-9b6f-1a2b3c4d5e6f";
const pdf = () => new File(["%PDF-1.7"], "rfp.pdf", { type: "application/pdf" });
const start = (overrides: Partial<Parameters<typeof uploadDocument>[0]> = {}) =>
  uploadDocument({ workspaceId: WS, proposalId: TEST_PROPOSAL_ID, category: "RFP", file: pdf(), ...overrides });
const lastRequest = () => FakeXhr.requests.at(-1)!;

beforeEach(() => {
  FakeXhr.reset();
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
});
afterEach(() => vi.unstubAllGlobals());

describe("uploadDocument", () => {
  it("posts the file as multipart through the BFF with the category and workspace header", async () => {
    const upload = start({ category: "RFI" });
    const req = lastRequest();
    expect(req.method).toBe("POST");
    expect(req.url).toBe(`/api/backend/api/proposals/${TEST_PROPOSAL_ID}/documents?category=RFI`);
    expect(req.requestHeaders["x-workspace-id"]).toBe(WS);
    expect(req.file?.name).toBe("rfp.pdf");

    req.succeed();
    await expect(upload).resolves.toMatchObject({ fileName: "rfp.pdf", category: "RFI", processingStatus: "UPLOADED" });
  });

  it("reports upload progress as a fraction", async () => {
    const onProgress = vi.fn();
    const upload = start({ onProgress });
    lastRequest().progress(25, 100);
    lastRequest().progress(100, 100);
    lastRequest().succeed();
    await upload;
    expect(onProgress.mock.calls.map(([f]) => f)).toEqual([0.25, 1, 1]);
  });

  it("rejects with ApiError carrying the problem details (422 malware)", async () => {
    const upload = start();
    lastRequest().problem(422, { documentId: "d-1", traceId: "trace-9" });
    const error = await upload.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 422, traceId: "trace-9" });
    expect((error as ApiError).problem?.documentId).toBe("d-1");
  });

  it("reads Retry-After on 503", async () => {
    const upload = start();
    lastRequest().problem(503, {}, { "Retry-After": "30" });
    await expect(upload).rejects.toMatchObject({ status: 503, retryAfterSeconds: 30 });
  });

  it("treats a 2xx without a JSON body as a bad gateway", async () => {
    const upload = start();
    lastRequest().respond(201);
    await expect(upload).rejects.toMatchObject({ status: 502 });
  });

  it("rejects with NetworkError when the request fails", async () => {
    const upload = start();
    lastRequest().networkError();
    await expect(upload).rejects.toBeInstanceOf(NetworkError);
  });

  it("aborts the request and rejects with AbortError when cancelled", async () => {
    const controller = new AbortController();
    const upload = start({ signal: controller.signal });
    controller.abort();
    await expect(upload).rejects.toMatchObject({ name: "AbortError" });
    expect(lastRequest().aborted).toBe(true);
  });

  it("does not send anything when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(start({ signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    expect(FakeXhr.requests).toHaveLength(0);
  });

  it("encodes path and query values", () => {
    void start({ proposalId: "../../auth/login" }).catch(() => {});
    expect(lastRequest().url).toBe("/api/backend/api/proposals/..%2F..%2Fauth%2Flogin/documents?category=RFP");
  });
});
