import { describe, expect, it } from "vitest";

import { forwardedFor } from "./backend";

const req = (xff?: string) => new Request("http://localhost:3000/", { headers: xff ? { "x-forwarded-for": xff } : {} });

describe("forwardedFor", () => {
  it("uses the entry appended by our ingress (last), not client-supplied ones", () => {
    expect(forwardedFor(req("6.6.6.6, 203.0.113.7"))).toBe("203.0.113.7");
    expect(forwardedFor(req("2001:db8::1"))).toBe("2001:db8::1");
  });

  it("ignores missing or malformed values", () => {
    expect(forwardedFor(req())).toBeUndefined();
    expect(forwardedFor(req("1.2.3.4, not-an-ip"))).toBeUndefined();
    expect(forwardedFor(req("1.2.3.4\r\nX-Evil: 1".replace(/\r\n/, " ")))).toBeUndefined();
  });
});
