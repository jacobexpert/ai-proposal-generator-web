import { describe, expect, it } from "vitest";

import { loginUrl, safeReturnUrl } from "./return-url";

describe("safeReturnUrl", () => {
  it.each([
    ["/proposals", "/proposals"],
    ["/proposals/42?tab=review#top", "/proposals/42?tab=review#top"],
    ["/settings/members", "/settings/members"],
  ])("keeps internal path %s", (input, expected) => {
    expect(safeReturnUrl(input)).toBe(expected);
  });

  it.each([
    null,
    undefined,
    "",
    "https://evil.example.com",
    "//evil.example.com",
    "/\\evil.example.com",
    "javascript:alert(1)",
    "proposals",
    "/a\r\nSet-Cookie:x",
    "/foo\\bar",
    "/login",
    "/login?returnUrl=/x",
    `/${"a".repeat(3000)}`,
  ])("falls back for %s", (input) => {
    expect(safeReturnUrl(input as string | null | undefined)).toBe("/");
  });

  it("keeps percent-encoded characters encoded (no header injection)", () => {
    const out = safeReturnUrl("/%0d%0aSet-Cookie:x");
    expect(out).not.toMatch(/[\r\n]/);
    expect(out.startsWith("/")).toBe(true);
  });

  it("builds the login URL with an encoded return target", () => {
    expect(loginUrl("/proposals?q=a b")).toBe("/login?returnUrl=%2Fproposals%3Fq%3Da%2520b");
    expect(loginUrl("/")).toBe("/login");
    expect(loginUrl("https://evil.example.com")).toBe("/login");
  });
});
