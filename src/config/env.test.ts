import { describe, expect, it } from "vitest";

import { parsePublicEnv } from "./env";

describe("parsePublicEnv", () => {
  it("accepts an http(s) API base URL and strips trailing slashes", () => {
    expect(parsePublicEnv({ NEXT_PUBLIC_API_BASE_URL: "https://api.example.com//" })).toEqual({
      NEXT_PUBLIC_API_BASE_URL: "https://api.example.com",
    });
  });

  it("fails fast when the API base URL is missing", () => {
    expect(() => parsePublicEnv({})).toThrow(/NEXT_PUBLIC_API_BASE_URL/);
  });

  it.each(["not a url", "ftp://api.example.com", "javascript:alert(1)"])("rejects %s", (value) => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_API_BASE_URL: value })).toThrow(/Invalid public environment/);
  });
});
