import { describe, expect, it } from "vitest";

import { parseServerEnv } from "./env";

describe("parseServerEnv", () => {
  it("accepts an http(s) API base URL, strips trailing slashes and defaults the timeout", () => {
    expect(parseServerEnv({ API_BASE_URL: "https://api.example.com//" })).toEqual({
      API_BASE_URL: "https://api.example.com",
      API_TIMEOUT_MS: 30_000,
      API_UPLOAD_TIMEOUT_MS: 300_000,
    });
  });

  it("parses a custom timeout", () => {
    expect(parseServerEnv({ API_BASE_URL: "http://localhost:8080", API_TIMEOUT_MS: "5000" }).API_TIMEOUT_MS).toBe(5000);
  });

  it("fails fast when the API base URL is missing", () => {
    expect(() => parseServerEnv({})).toThrow(/API_BASE_URL/);
  });

  it.each(["not a url", "ftp://api.example.com", "javascript:alert(1)"])("rejects %s", (value) => {
    expect(() => parseServerEnv({ API_BASE_URL: value })).toThrow(/Invalid server environment/);
  });

  it("parses a custom upload timeout", () => {
    expect(
      parseServerEnv({ API_BASE_URL: "http://localhost:8080", API_UPLOAD_TIMEOUT_MS: "600000" }).API_UPLOAD_TIMEOUT_MS,
    ).toBe(600_000);
  });

  it("rejects an out-of-range timeout", () => {
    expect(() => parseServerEnv({ API_BASE_URL: "http://localhost:8080", API_TIMEOUT_MS: "10" })).toThrow();
  });
});
