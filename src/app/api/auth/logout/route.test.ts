// @vitest-environment node
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { BACKEND_URL } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { resetRefreshCache } from "@/server/session";
import { RENEWED_TOKENS, bffRequest, setCookies } from "@/test/bff";

import { POST } from "./route";

describe("POST /api/auth/logout", () => {
  beforeEach(() => resetRefreshCache());

  it("revokes the session in the API and clears both cookies", async () => {
    let auth: string | null = null;
    let body: unknown;
    server.use(
      http.post(`${BACKEND_URL}/api/auth/logout`, async ({ request }) => {
        auth = request.headers.get("authorization");
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const res = await POST(
      bffRequest("/api/auth/logout", { method: "POST", cookies: { apg_at: "access-1", apg_rt: "refresh-1" } }),
    );

    expect(res.status).toBe(204);
    expect(auth).toBe("Bearer access-1");
    expect(body).toEqual({ refreshToken: "refresh-1" });
    const cookies = setCookies(res);
    expect(cookies.apg_at.value).toBe("");
    expect(cookies.apg_at.attrs).toContain("max-age=0");
    expect(cookies.apg_rt.attrs).toContain("max-age=0");
  });

  it("refreshes an expired access token first so the refresh session is revoked too", async () => {
    let auth: string | null = null;
    server.use(
      http.post(`${BACKEND_URL}/api/auth/refresh`, () => HttpResponse.json(RENEWED_TOKENS)),
      http.post(`${BACKEND_URL}/api/auth/logout`, ({ request }) => {
        auth = request.headers.get("authorization");
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const res = await POST(bffRequest("/api/auth/logout", { method: "POST", cookies: { apg_rt: "refresh-1" } }));
    expect(res.status).toBe(204);
    expect(auth).toBe("Bearer access-2");
  });

  it("still clears the cookies when the API is down", async () => {
    server.use(http.post(`${BACKEND_URL}/api/auth/logout`, () => HttpResponse.error()));
    const res = await POST(bffRequest("/api/auth/logout", { method: "POST", cookies: { apg_at: "access-1" } }));
    expect(res.status).toBe(204);
    expect(setCookies(res).apg_at.attrs).toContain("max-age=0");
  });

  it("rejects cross-site requests (CSRF) and keeps the session", async () => {
    const res = await POST(
      bffRequest("/api/auth/logout", {
        method: "POST",
        cookies: { apg_at: "access-1" },
        origin: "https://evil.example.com",
      }),
    );
    expect(res.status).toBe(403);
    expect(res.headers.getSetCookie()).toHaveLength(0);
  });
});
