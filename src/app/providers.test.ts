import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";

import { redirectToLoginOnUnauthorized } from "./providers";

describe("redirectToLoginOnUnauthorized", () => {
  const assign = vi.fn();
  const original = window.location;

  function at(url: string) {
    const u = new URL(url);
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { pathname: u.pathname, search: u.search, assign },
    });
  }

  afterEach(() => {
    assign.mockReset();
    Object.defineProperty(window, "location", { configurable: true, value: original });
  });

  it("sends the user to /login with the current page as returnUrl on 401", () => {
    at("http://localhost:3000/proposals/42?tab=review");
    redirectToLoginOnUnauthorized(new ApiError(401, null));
    expect(assign).toHaveBeenCalledWith("/login?returnUrl=%2Fproposals%2F42%3Ftab%3Dreview");
  });

  it("ignores other errors and the login page itself", () => {
    at("http://localhost:3000/proposals");
    redirectToLoginOnUnauthorized(new ApiError(403, null));
    redirectToLoginOnUnauthorized(new Error("boom"));
    at("http://localhost:3000/login");
    redirectToLoginOnUnauthorized(new ApiError(401, null));
    expect(assign).not.toHaveBeenCalled();
  });
});
