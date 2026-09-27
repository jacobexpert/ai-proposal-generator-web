// @vitest-environment node
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { BACKEND_URL } from "@/mocks/handlers";
import { server } from "@/mocks/server";
import { TOKENS, bffRequest, setCookies } from "@/test/bff";

import { POST } from "./route";

const WORKSPACE_ID = "7c9d2e4f-5b6a-4d3c-8e1f-2a3b4c5d6e7f";
const input = {
  email: "new@example.com",
  password: "a long enough password",
  displayName: "New Person",
  workspaceName: "  ",
};
const register = (json: unknown = input, extra: Parameters<typeof bffRequest>[1] = {}) =>
  POST(bffRequest("/api/auth/register", { method: "POST", json, ...extra }));

describe("POST /api/auth/register", () => {
  it("signs the user in with HttpOnly cookies, remembers the new workspace, returns no token", async () => {
    let forwarded: unknown;
    let forwardedIp: string | null = null;
    server.use(
      http.post(`${BACKEND_URL}/api/auth/register`, async ({ request }) => {
        forwarded = await request.json();
        forwardedIp = request.headers.get("x-forwarded-for");
        return HttpResponse.json({ ...TOKENS, workspaceId: WORKSPACE_ID.toUpperCase() }, { status: 201 });
      }),
    );

    const res = await register(input, { headers: { "x-forwarded-for": "203.0.113.9" } });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ workspaceId: WORKSPACE_ID });
    expect(JSON.stringify(body)).not.toContain("access-1");
    // Blank workspace name is dropped so the API applies its default ("<name>'s workspace").
    expect(forwarded).toEqual({ email: input.email, password: input.password, displayName: input.displayName });
    expect(forwardedIp).toBe("203.0.113.9");

    const cookies = setCookies(res);
    expect(cookies.apg_at.value).toBe("access-1");
    expect(cookies.apg_at.attrs).toContain("httponly");
    expect(cookies.apg_rt.attrs).toContain("httponly");
    expect(cookies.apg_ws.value).toBe(WORKSPACE_ID);
    expect(cookies.apg_ws.attrs).not.toContain("httponly");
    expect(cookies.apg_ws.attrs).toContain("samesite=lax");
  });

  it("validates the password policy before calling the API", async () => {
    let called = false;
    server.use(
      http.post(`${BACKEND_URL}/api/auth/register`, () => {
        called = true;
        return HttpResponse.json({});
      }),
    );
    const short = await register({ ...input, password: "short" });
    expect(short.status).toBe(400);
    expect((await short.json()).errors).toEqual([{ field: "password", message: "Use at least 12 characters." }]);

    const same = await register({ ...input, email: "same@example.com", password: "Same@Example.com" });
    expect((await same.json()).errors[0]).toMatchObject({ field: "password" });
    expect(called).toBe(false);
  });

  it.each([
    [409, "Conflict"],
    [429, "Too Many Requests"],
  ])("relays %s from the API without setting cookies", async (status, title) => {
    server.use(
      http.post(`${BACKEND_URL}/api/auth/register`, () =>
        HttpResponse.json(
          { title, status },
          { status, headers: { "Content-Type": "application/problem+json", "Retry-After": "600" } },
        ),
      ),
    );
    const res = await register();
    expect(res.status).toBe(status);
    expect(res.headers.get("retry-after")).toBe("600");
    expect(res.headers.getSetCookie()).toHaveLength(0);
  });

  it("answers 502 when the API response has no workspace", async () => {
    server.use(http.post(`${BACKEND_URL}/api/auth/register`, () => HttpResponse.json(TOKENS, { status: 201 })));
    const res = await register();
    expect(res.status).toBe(502);
    expect(res.headers.getSetCookie()).toHaveLength(0);
  });

  it("answers 503 when the API is unreachable", async () => {
    server.use(http.post(`${BACKEND_URL}/api/auth/register`, () => HttpResponse.error()));
    expect((await register()).status).toBe(503);
  });

  it("rejects cross-site requests (CSRF)", async () => {
    expect((await register(input, { origin: "https://evil.example.com" })).status).toBe(403);
  });
});
