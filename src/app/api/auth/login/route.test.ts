// @vitest-environment node
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { BACKEND_URL } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { resetRefreshCache } from "@/server/session";
import { TOKENS, bffRequest, setCookies } from "@/test/bff";

import { POST } from "./route";

const credentials = { email: "jackie@example.com", password: "correct horse battery" };

describe("POST /api/auth/login", () => {
  beforeEach(() => resetRefreshCache());

  it("stores tokens in HttpOnly cookies and never returns them in the body", async () => {
    let forwarded: unknown;
    server.use(
      http.post(`${BACKEND_URL}/api/auth/login`, async ({ request }) => {
        forwarded = await request.json();
        return HttpResponse.json(TOKENS);
      }),
    );

    const res = await POST(bffRequest("/api/auth/login", { method: "POST", json: credentials }));

    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    expect(forwarded).toEqual(credentials);
    const cookies = setCookies(res);
    expect(cookies.apg_at.value).toBe("access-1");
    expect(cookies.apg_at.attrs).toContain("httponly");
    expect(cookies.apg_at.attrs).toContain("secure");
    expect(cookies.apg_at.attrs).toContain("samesite=lax");
    expect(cookies.apg_at.attrs).toContain("max-age=870");
    expect(cookies.apg_rt.value).toBe("refresh-1");
    expect(cookies.apg_rt.attrs).toContain("httponly");
    expect(cookies.apg_rt.attrs).toContain("max-age=1209600");
  });

  it("relays the API's 401 problem without setting cookies", async () => {
    server.use(
      http.post(`${BACKEND_URL}/api/auth/login`, () =>
        HttpResponse.json(
          { title: "Unauthorized", status: 401 },
          { status: 401, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );
    const res = await POST(bffRequest("/api/auth/login", { method: "POST", json: credentials }));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ status: 401 });
    expect(res.headers.getSetCookie()).toHaveLength(0);
  });

  it("relays 429 with Retry-After", async () => {
    server.use(
      http.post(`${BACKEND_URL}/api/auth/login`, () =>
        HttpResponse.json(
          { title: "Too Many Requests", status: 429 },
          { status: 429, headers: { "Retry-After": "900" } },
        ),
      ),
    );
    const res = await POST(bffRequest("/api/auth/login", { method: "POST", json: credentials }));
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("900");
  });

  it("validates the payload before calling the API", async () => {
    const res = await POST(bffRequest("/api/auth/login", { method: "POST", json: { email: "nope", password: "" } }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.errors.map((e: { field: string }) => e.field).sort()).toEqual(["email", "password"]);
  });

  it("rejects cross-site requests (CSRF)", async () => {
    const res = await POST(
      bffRequest("/api/auth/login", { method: "POST", json: credentials, origin: "https://evil.example.com" }),
    );
    expect(res.status).toBe(403);
  });

  it("answers 503 when the API is unreachable", async () => {
    server.use(http.post(`${BACKEND_URL}/api/auth/login`, () => HttpResponse.error()));
    const res = await POST(bffRequest("/api/auth/login", { method: "POST", json: credentials }));
    expect(res.status).toBe(503);
  });

  it("answers 502 on an unexpected token payload", async () => {
    server.use(http.post(`${BACKEND_URL}/api/auth/login`, () => HttpResponse.json({ accessToken: "" })));
    const res = await POST(bffRequest("/api/auth/login", { method: "POST", json: credentials }));
    expect(res.status).toBe(502);
    expect(res.headers.getSetCookie()).toHaveLength(0);
  });
});
