// @vitest-environment node
import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BACKEND_URL } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { resetRefreshCache } from "@/server/session";
import { APP_ORIGIN, RENEWED_TOKENS, bffRequest, setCookies } from "@/test/bff";

import { DELETE, GET, POST } from "./route";

const ctx = (path: string[]) => ({ params: Promise.resolve({ path }) });
const WS = "3f6c2b1e-9a7d-4c21-8e0f-1b2c3d4e5f60";

describe("BFF proxy /api/backend/*", () => {
  beforeEach(() => resetRefreshCache());

  it("forwards to the API with the bearer token from the cookie and relays the response", async () => {
    let seen: Headers | undefined;
    server.use(
      http.get(`${BACKEND_URL}/api/proposals`, ({ request }) => {
        seen = request.headers;
        expect(new URL(request.url).search).toBe("?status=DRAFT&page=0");
        return HttpResponse.json({ items: [] }, { headers: { "X-Request-Id": "req-1" } });
      }),
    );

    const res = await GET(
      bffRequest("/api/backend/api/proposals?status=DRAFT&page=0", {
        cookies: { apg_at: "access-1" },
        headers: { "x-workspace-id": WS, authorization: "Bearer attacker", "x-forwarded-for": "203.0.113.7" },
      }),
      ctx(["api", "proposals"]),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [] });
    expect(res.headers.get("x-request-id")).toBe("req-1");
    expect(seen?.get("authorization")).toBe("Bearer access-1");
    expect(seen?.get("x-workspace-id")).toBe(WS);
    expect(seen?.get("x-forwarded-for")).toBe("203.0.113.7");
    expect(seen?.get("cookie")).toBeNull();
  });

  it.each([
    [["api", "auth", "login"]],
    [["api", "auth"]],
    [["actuator", "env"]],
    [["v3", "api-docs"]],
    [["api", "..", "actuator", "env"]],
    [["api", "proposals%2F..%2Fx"]],
    [["api", "a\\b"]],
    [[]],
  ])("refuses non allow-listed path %j", async (segments) => {
    const res = await GET(bffRequest("/api/backend/x", { cookies: { apg_at: "access-1" } }), ctx(segments));
    expect(res.status).toBe(404);
  });

  it("drops an invalid X-Workspace-Id instead of forwarding it", async () => {
    let ws: string | null = "unset";
    server.use(
      http.get(`${BACKEND_URL}/api/me`, ({ request }) => {
        ws = request.headers.get("x-workspace-id");
        return HttpResponse.json({});
      }),
    );
    await GET(
      bffRequest("/api/backend/api/me", { cookies: { apg_at: "a" }, headers: { "x-workspace-id": "../../etc" } }),
      ctx(["api", "me"]),
    );
    expect(ws).toBeNull();
  });

  it("rejects cross-site state-changing requests (CSRF)", async () => {
    const res = await POST(
      bffRequest("/api/backend/api/proposals", {
        method: "POST",
        json: {},
        cookies: { apg_at: "access-1" },
        origin: "https://evil.example.com",
      }),
      ctx(["api", "proposals"]),
    );
    expect(res.status).toBe(403);
  });

  it("refreshes first when the access cookie has expired, then renews both cookies", async () => {
    let auth: string | null = null;
    server.use(
      http.post(`${BACKEND_URL}/api/auth/refresh`, async ({ request }) => {
        expect(await request.json()).toEqual({ refreshToken: "refresh-1" });
        return HttpResponse.json(RENEWED_TOKENS);
      }),
      http.get(`${BACKEND_URL}/api/me`, ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({ id: "u1" });
      }),
    );

    const res = await GET(bffRequest("/api/backend/api/me", { cookies: { apg_rt: "refresh-1" } }), ctx(["api", "me"]));

    expect(res.status).toBe(200);
    expect(auth).toBe("Bearer access-2");
    const cookies = setCookies(res);
    expect(cookies.apg_at.value).toBe("access-2");
    expect(cookies.apg_rt.value).toBe("refresh-2");
  });

  it("refreshes once on 401 and replays a JSON request", async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(`${BACKEND_URL}/api/auth/refresh`, () => HttpResponse.json(RENEWED_TOKENS)),
      http.post(`${BACKEND_URL}/api/proposals`, async ({ request }) => {
        bodies.push(await request.json());
        return request.headers.get("authorization") === "Bearer access-2"
          ? HttpResponse.json({ id: "p1" }, { status: 201, headers: { Location: "/api/proposals/p1" } })
          : HttpResponse.json({ status: 401 }, { status: 401 });
      }),
    );

    const res = await POST(
      bffRequest("/api/backend/api/proposals", {
        method: "POST",
        json: { name: "Azure" },
        cookies: { apg_at: "stale", apg_rt: "refresh-1" },
      }),
      ctx(["api", "proposals"]),
    );

    expect(res.status).toBe(201);
    expect(res.headers.get("location")).toBe("/api/backend/api/proposals/p1");
    expect(bodies).toEqual([{ name: "Azure" }, { name: "Azure" }]);
    expect(setCookies(res).apg_at.value).toBe("access-2");
  });

  it("shares one refresh call between concurrent requests (rotating refresh token)", async () => {
    let refreshCalls = 0;
    server.use(
      http.post(`${BACKEND_URL}/api/auth/refresh`, () => {
        refreshCalls += 1;
        return HttpResponse.json(RENEWED_TOKENS);
      }),
      http.get(`${BACKEND_URL}/api/me`, () => HttpResponse.json({})),
    );
    await Promise.all(
      [1, 2, 3].map(() =>
        GET(bffRequest("/api/backend/api/me", { cookies: { apg_rt: "refresh-1" } }), ctx(["api", "me"])),
      ),
    );
    expect(refreshCalls).toBe(1);
  });

  it("ends the session (clears cookies, 401) when the refresh token is rejected", async () => {
    server.use(
      http.post(`${BACKEND_URL}/api/auth/refresh`, () => HttpResponse.json({ status: 401 }, { status: 401 })),
      http.get(`${BACKEND_URL}/api/me`, () => HttpResponse.json({ status: 401 }, { status: 401 })),
    );
    const res = await GET(bffRequest("/api/backend/api/me", { cookies: { apg_rt: "revoked" } }), ctx(["api", "me"]));
    expect(res.status).toBe(401);
    const cookies = setCookies(res);
    expect(cookies.apg_at.attrs).toContain("max-age=0");
    expect(cookies.apg_rt.attrs).toContain("max-age=0");
  });

  // The API now answers Spring Security's 401/403 with Problem Details (+ traceId) and keeps
  // WWW-Authenticate: the body reaches the browser, the header does not.
  const springProblem = (status: 401 | 403) =>
    HttpResponse.json(
      { type: "about:blank", title: status === 401 ? "Unauthorized" : "Forbidden", status, traceId: `trace-${status}` },
      {
        status,
        headers: {
          "Content-Type": "application/problem+json",
          "WWW-Authenticate": 'Bearer error="invalid_token", error_description="Jwt expired at 2026-09-27T10:00:00Z"',
        },
      },
    );

  it("relays Spring Security's 401 Problem Details without WWW-Authenticate when the session cannot be renewed", async () => {
    server.use(
      http.post(`${BACKEND_URL}/api/auth/refresh`, () => springProblem(401)),
      http.get(`${BACKEND_URL}/api/me`, () => springProblem(401)),
    );
    const res = await GET(
      bffRequest("/api/backend/api/me", { cookies: { apg_at: "expired", apg_rt: "revoked" } }),
      ctx(["api", "me"]),
    );
    expect(res.status).toBe(401);
    expect(res.headers.get("content-type")).toContain("application/problem+json");
    expect(res.headers.get("www-authenticate")).toBeNull();
    expect(await res.json()).toMatchObject({ status: 401, traceId: "trace-401" });
    expect(setCookies(res).apg_at.attrs).toContain("max-age=0");
  });

  it("replays after a 401 with a body once the token is renewed", async () => {
    server.use(
      http.post(`${BACKEND_URL}/api/auth/refresh`, () => HttpResponse.json(RENEWED_TOKENS)),
      http.get(`${BACKEND_URL}/api/me`, ({ request }) =>
        request.headers.get("authorization") === "Bearer access-2"
          ? HttpResponse.json({ email: "jackie@example.com" })
          : springProblem(401),
      ),
    );
    const res = await GET(
      bffRequest("/api/backend/api/me", { cookies: { apg_at: "expired", apg_rt: "refresh-1" } }),
      ctx(["api", "me"]),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ email: "jackie@example.com" });
  });

  it("relays Spring Security's 403 Problem Details and keeps the session", async () => {
    server.use(http.get(`${BACKEND_URL}/api/workspaces/current`, () => springProblem(403)));
    const res = await GET(
      bffRequest("/api/backend/api/workspaces/current", {
        cookies: { apg_at: "access-1" },
        headers: { "x-workspace-id": WS },
      }),
      ctx(["api", "workspaces", "current"]),
    );
    expect(res.status).toBe(403);
    expect(res.headers.get("www-authenticate")).toBeNull();
    expect(await res.json()).toMatchObject({ status: 403, traceId: "trace-403" });
    expect(res.headers.getSetCookie()).toHaveLength(0);
  });

  it("passes public endpoints through without a session", async () => {
    let auth: string | null = "unset";
    server.use(
      http.get(`${BACKEND_URL}/actuator/health`, ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({ status: "UP" });
      }),
    );
    const res = await GET(bffRequest("/api/backend/actuator/health"), ctx(["actuator", "health"]));
    expect(res.status).toBe(200);
    expect(auth).toBeNull();
    expect(res.headers.getSetCookie()).toHaveLength(0);
  });

  it("relays 204 without a body and never follows upstream redirects", async () => {
    server.use(
      http.delete(`${BACKEND_URL}/api/proposals/p1`, () => new HttpResponse(null, { status: 204 })),
      http.get(
        `${BACKEND_URL}/api/templates`,
        () => new HttpResponse(null, { status: 302, headers: { Location: "https://evil.example.com" } }),
      ),
    );
    const del = await DELETE(
      bffRequest("/api/backend/api/proposals/p1", { method: "DELETE", cookies: { apg_at: "a" } }),
      ctx(["api", "proposals", "p1"]),
    );
    expect(del.status).toBe(204);
    const redirect = await GET(
      bffRequest("/api/backend/api/templates", { cookies: { apg_at: "a" } }),
      ctx(["api", "templates"]),
    );
    expect(redirect.status).toBe(502);
    expect(redirect.headers.get("location")).toBeNull();
  });

  describe("timeouts (US-FE-08)", () => {
    afterEach(() => vi.restoreAllMocks());

    it("gives streamed uploads the upload timeout and ordinary calls the default one", async () => {
      const timeout = vi.spyOn(AbortSignal, "timeout");
      server.use(
        http.post(`${BACKEND_URL}/api/proposals/:id/documents`, () => HttpResponse.json({ id: "d1" }, { status: 201 })),
        http.get(`${BACKEND_URL}/api/me`, () => HttpResponse.json({})),
      );
      const form = new FormData();
      form.append("file", new File(["%PDF-1.7"], "rfp.pdf", { type: "application/pdf" }));
      const upload = new NextRequest(`${APP_ORIGIN}/api/backend/api/proposals/p1/documents?category=RFP`, {
        method: "POST",
        body: form,
        headers: { origin: APP_ORIGIN, cookie: "apg_at=a", "x-workspace-id": WS },
      });
      expect(upload.headers.get("content-type")).toMatch(/^multipart\/form-data/);
      const res = await POST(upload, ctx(["api", "proposals", "p1", "documents"]));
      expect(res.status).toBe(201);
      expect(timeout).toHaveBeenLastCalledWith(300_000);

      await GET(bffRequest("/api/backend/api/me", { cookies: { apg_at: "a" } }), ctx(["api", "me"]));
      expect(timeout).toHaveBeenLastCalledWith(30_000);
    });

    it("answers 504 (not 503) when the API does not answer in time", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new DOMException("timed out", "TimeoutError"));
      const res = await GET(bffRequest("/api/backend/api/me", { cookies: { apg_at: "a" } }), ctx(["api", "me"]));
      expect(res.status).toBe(504);
      expect(await res.json()).toMatchObject({ title: "Gateway Timeout" });
    });
  });

  it("answers 503 when the API is unreachable", async () => {
    server.use(http.get(`${BACKEND_URL}/api/me`, () => HttpResponse.error()));
    const res = await GET(bffRequest("/api/backend/api/me", { cookies: { apg_at: "a" } }), ctx(["api", "me"]));
    expect(res.status).toBe(503);
  });
});
