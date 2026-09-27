import { describe, expect, it } from "vitest";

import { ApiError, NetworkError } from "@/lib/api/client";

import { describeUploadError } from "./upload-errors";

const apiError = (status: number, detail?: string) => new ApiError(status, { status, detail, traceId: "t-1" });

describe("describeUploadError", () => {
  it.each([
    [413, /larger than 25 MB/, false],
    [415, /unsupported file type/i, false],
    [422, /malware detected/i, false],
    [400, /not accepted/i, false],
    [403, /not found, or you don't have access/i, false],
    [404, /not found, or you don't have access/i, false],
    [503, /temporarily unavailable/i, true],
    [500, /went wrong/i, true],
    [429, /too many uploads/i, true],
  ])("maps %d", (status, message, retryable) => {
    const failure = describeUploadError(apiError(status));
    expect(failure.message).toMatch(message);
    expect(failure.retryable).toBe(retryable);
    expect(failure.traceId).toBe("t-1");
  });

  it("uses the server detail for 409 and falls back to a status message", () => {
    expect(describeUploadError(apiError(409, "Proposal is ANALYZING")).message).toBe("Proposal is ANALYZING");
    expect(describeUploadError(apiError(409)).message).toMatch(/current status/);
  });

  it("does not show server detail for other statuses", () => {
    expect(describeUploadError(apiError(415, "<b>raw</b>")).message).not.toContain("raw");
  });

  it("treats network failures as retryable", () => {
    expect(describeUploadError(new NetworkError(new Error("x")))).toMatchObject({ retryable: true });
  });
});
