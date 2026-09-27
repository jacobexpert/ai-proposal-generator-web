import type { DocumentItem } from "./types";

export const TEST_PROPOSAL_ID = "3f6c2a1b-8d4e-4f5a-9b6c-7d8e9f0a1b2c";

let sequence = 0;

/** A `DocumentResponse` as the API returns it after a successful upload (US-BE-07). */
export function makeDocument(overrides: Partial<DocumentItem> = {}): DocumentItem {
  sequence += 1;
  return {
    id: `00000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`,
    proposalId: TEST_PROPOSAL_ID,
    fileName: "rfp.pdf",
    contentType: "application/pdf",
    sizeBytes: 1024,
    category: "RFP",
    checksumSha256: "0".repeat(64),
    processingStatus: "UPLOADED",
    uploadedBy: "11111111-2222-4333-8444-555555555555",
    createdAt: "2026-09-27T08:00:00Z",
    updatedAt: "2026-09-27T08:00:00Z",
    ...overrides,
  };
}

/**
 * Controllable stand-in for XMLHttpRequest (install with `vi.stubGlobal("XMLHttpRequest", FakeXhr)`).
 * MSW cannot intercept jsdom `FormData` bodies, and it cannot emit upload progress either.
 */
export class FakeXhr {
  static requests: FakeXhr[] = [];
  static reset() {
    FakeXhr.requests = [];
  }

  method = "";
  url = "";
  requestHeaders: Record<string, string> = {};
  body: unknown;
  aborted = false;
  status = 0;
  responseText = "";
  private responseHeaders: Record<string, string> = {};

  upload: { onprogress: ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = {
    onprogress: null,
  };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(name: string, value: string) {
    this.requestHeaders[name.toLowerCase()] = value;
  }
  getResponseHeader(name: string): string | null {
    return this.responseHeaders[name.toLowerCase()] ?? null;
  }
  send(body: unknown) {
    this.body = body;
    FakeXhr.requests.push(this);
  }
  abort() {
    this.aborted = true;
    this.onabort?.();
  }

  get file(): File | undefined {
    const value = this.body instanceof FormData ? this.body.get("file") : null;
    return value instanceof File ? value : undefined;
  }
  get category(): string | null {
    return new URL(this.url, "http://localhost").searchParams.get("category");
  }

  progress(loaded: number, total: number) {
    this.upload.onprogress?.({ lengthComputable: true, loaded, total });
  }
  respond(status: number, body?: unknown, headers: Record<string, string> = {}) {
    this.status = status;
    this.responseText = body === undefined ? "" : JSON.stringify(body);
    this.responseHeaders = {
      "content-type": status >= 400 ? "application/problem+json" : "application/json",
      ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])),
    };
    this.onload?.();
  }
  /** 201 with a document built from the request. */
  succeed(overrides: Partial<DocumentItem> = {}) {
    this.respond(
      201,
      makeDocument({
        fileName: this.file?.name,
        sizeBytes: this.file?.size,
        category: (this.category ?? "OTHER") as DocumentItem["category"],
        ...overrides,
      }),
    );
  }
  problem(status: number, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
    this.respond(status, { type: "about:blank", status, ...extra }, headers);
  }
  networkError() {
    this.onerror?.();
  }
}
