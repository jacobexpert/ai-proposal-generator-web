import { describe, expect, it } from "vitest";

import { isSameOriginRequest } from "./csrf";

const url = "http://localhost:3000/api/auth/logout";
const req = (method: string, headers: Record<string, string> = {}) => new Request(url, { method, headers });

describe("isSameOriginRequest", () => {
  it("allows safe methods from anywhere", () => {
    expect(isSameOriginRequest(req("GET", { "sec-fetch-site": "cross-site" }))).toBe(true);
  });

  it("uses Sec-Fetch-Site when present", () => {
    expect(isSameOriginRequest(req("POST", { "sec-fetch-site": "same-origin" }))).toBe(true);
    expect(isSameOriginRequest(req("POST", { "sec-fetch-site": "same-site" }))).toBe(false);
    expect(isSameOriginRequest(req("POST", { "sec-fetch-site": "cross-site", origin: "http://localhost:3000" }))).toBe(
      false,
    );
  });

  it("falls back to the Origin header", () => {
    expect(isSameOriginRequest(req("DELETE", { origin: "http://localhost:3000" }))).toBe(true);
    expect(isSameOriginRequest(req("PATCH", { origin: "https://evil.example.com" }))).toBe(false);
    expect(isSameOriginRequest(req("POST", { origin: "null" }))).toBe(false);
  });

  it("rejects unsafe requests without any origin information", () => {
    expect(isSameOriginRequest(req("POST"))).toBe(false);
  });
});
