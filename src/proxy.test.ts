// @vitest-environment node
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { BACKEND_URL } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { resetRefreshCache } from "@/server/session";
import { RENEWED_TOKENS, bffRequest, setCookies } from "@/test/bff";

import { proxy } from "./proxy";

const page = (path: string, cookies: Record<string, string> = {}) => bffRequest(path, { cookies, origin: null });

describe("proxy (route protection)", () => {
  beforeEach(() => resetRefreshCache());

  it("redirects anonymous users to /login with a safe returnUrl", async () => {
    const res = await proxy(page("/proposals/42?tab=review"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login?returnUrl=%2Fproposals%2F42%3Ftab%3Dreview");
  });

  it("does not add a returnUrl for the dashboard", async () => {
    const res = await proxy(page("/"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("lets signed-in users through", async () => {
    const res = await proxy(page("/proposals", { apg_at: "access-1" }));
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("lets anonymous users open the login page", async () => {
    const res = await proxy(page("/login?returnUrl=/proposals"));
    expect(res.headers.get("location")).toBeNull();
  });

  it("sends signed-in users away from /login to the (safe) returnUrl", async () => {
    const ok = await proxy(page("/login?returnUrl=/settings", { apg_at: "a" }));
    expect(ok.headers.get("location")).toBe("http://localhost:3000/settings");
    const evil = await proxy(page("/login?returnUrl=//evil.example.com", { apg_at: "a" }));
    expect(evil.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("renews an expired access cookie with the refresh cookie instead of logging out", async () => {
    server.use(http.post(`${BACKEND_URL}/api/auth/refresh`, () => HttpResponse.json(RENEWED_TOKENS)));
    const res = await proxy(page("/proposals", { apg_rt: "refresh-1" }));
    expect(res.headers.get("location")).toBeNull();
    const cookies = setCookies(res);
    expect(cookies.apg_at.value).toBe("access-2");
    expect(cookies.apg_rt.value).toBe("refresh-2");
  });

  it("clears a rejected refresh cookie and redirects to /login", async () => {
    server.use(http.post(`${BACKEND_URL}/api/auth/refresh`, () => HttpResponse.json({}, { status: 401 })));
    const res = await proxy(page("/proposals", { apg_rt: "revoked" }));
    expect(res.headers.get("location")).toContain("/login");
    expect(setCookies(res).apg_rt.attrs).toContain("max-age=0");
  });

  it("keeps the refresh cookie when the API is temporarily down", async () => {
    server.use(http.post(`${BACKEND_URL}/api/auth/refresh`, () => HttpResponse.error()));
    const res = await proxy(page("/proposals", { apg_rt: "refresh-1" }));
    expect(res.headers.get("location")).toContain("/login");
    expect(res.headers.getSetCookie()).toHaveLength(0);
  });
});
