import { describe, expect, it, vi } from "vitest";

import { ApiError, NetworkError } from "./client";
import { applyFieldErrors, describeApiError } from "./errors";

const problem = (status: number, extra: Record<string, unknown> = {}) =>
  new ApiError(status, { status, title: "t", traceId: "trace-1", ...extra });

describe("describeApiError (US-FE-04 AC2)", () => {
  it("maps 400 to validation with field errors", () => {
    const ui = describeApiError(problem(400, { errors: [{ field: "name", message: "must not be blank" }] }));
    expect(ui).toMatchObject({ kind: "validation", fieldErrors: { name: "must not be blank" }, retryable: false });
  });

  it("maps 401 to unauthorized", () => {
    expect(describeApiError(problem(401)).kind).toBe("unauthorized");
  });

  it("gives 403 and 404 the same copy, never revealing which", () => {
    const forbidden = describeApiError(problem(403));
    const missing = describeApiError(problem(404));
    expect(forbidden.kind).toBe("not-found");
    expect(forbidden.title).toBe("Not found or you don't have access");
    expect({ ...forbidden, status: 0 }).toEqual({ ...missing, status: 0 });
  });

  it("uses the API detail for 409 and has a fallback", () => {
    expect(describeApiError(problem(409, { detail: "Proposal is APPROVED" })).message).toBe("Proposal is APPROVED");
    expect(describeApiError(problem(409)).message).toMatch(/Refresh and try again/);
  });

  it.each([413, 415, 422])("maps %i to rejected", (status) => {
    expect(describeApiError(problem(status, { detail: "File type not allowed" }))).toMatchObject({
      kind: "rejected",
      message: "File type not allowed",
    });
  });

  it("maps 429 with Retry-After to a wait message", () => {
    const ui = describeApiError(new ApiError(429, { status: 429 }, 90));
    expect(ui).toMatchObject({ kind: "rate-limited", message: "Try again in 2 minutes.", retryable: true });
  });

  it("maps 5xx to server with the trace id and ignores server detail text", () => {
    const ui = describeApiError(problem(500, { detail: "NullPointerException at com.acme..." }));
    expect(ui).toMatchObject({ kind: "server", traceId: "trace-1", retryable: true });
    expect(ui.message).not.toContain("NullPointer");
    expect(describeApiError(problem(503)).message).toMatch(/temporarily unavailable/);
  });

  it("maps network and unknown errors", () => {
    expect(describeApiError(new NetworkError(new TypeError("fetch failed"))).kind).toBe("network");
    expect(describeApiError(new Error("x")).kind).toBe("unknown");
  });
});

describe("applyFieldErrors", () => {
  it("binds known fields and returns the rest", () => {
    const setError = vi.fn();
    const rest = applyFieldErrors(
      problem(400, {
        errors: [
          { field: "name", message: "too long" },
          { field: "version", message: "stale" },
        ],
      }),
      ["name", "deadline"] as const,
      setError,
    );
    expect(setError).toHaveBeenCalledWith("name", { type: "server", message: "too long" });
    expect(rest).toEqual(["stale"]);
  });

  it("ignores non-validation errors", () => {
    const setError = vi.fn();
    expect(applyFieldErrors(problem(500), ["name"] as const, setError)).toEqual([]);
    expect(setError).not.toHaveBeenCalled();
  });
});

describe("Spring Security Problem Details (401/403 with traceId)", () => {
  it("keeps the trace id but never shows the server's security wording", () => {
    const expired = describeApiError(
      new ApiError(401, { status: 401, title: "Unauthorized", detail: "Jwt expired at 2026-09-27", traceId: "t-401" }),
    );
    expect(expired).toMatchObject({ kind: "unauthorized", traceId: "t-401" });
    expect(expired.message).not.toContain("Jwt");

    const denied = describeApiError(
      new ApiError(403, { status: 403, title: "Forbidden", detail: "Access Denied", traceId: "t-403" }),
    );
    expect(denied).toMatchObject({ kind: "not-found", title: "Not found or you don't have access", traceId: "t-403" });
    expect(denied.message).not.toContain("Access Denied");
  });
});
