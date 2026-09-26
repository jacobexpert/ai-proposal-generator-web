import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { API_BASE_URL } from "@/mocks/handlers";
import { server } from "@/mocks/server";

import { ApiError, NetworkError, apiFetch } from "./client";

describe("apiFetch", () => {
  it("returns the parsed JSON body", async () => {
    server.use(http.get(`${API_BASE_URL}/api/ping`, () => HttpResponse.json({ ok: true })));
    await expect(apiFetch("/api/ping")).resolves.toEqual({ ok: true });
  });

  it("sends a JSON body with the right content type", async () => {
    server.use(
      http.post(`${API_BASE_URL}/api/echo`, async ({ request }) =>
        HttpResponse.json({ contentType: request.headers.get("content-type"), body: await request.json() }),
      ),
    );
    await expect(apiFetch("/api/echo", { method: "POST", json: { a: 1 } })).resolves.toEqual({
      contentType: "application/json",
      body: { a: 1 },
    });
  });

  it("maps an error response to ApiError with problem details and trace id", async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/missing`, () =>
        HttpResponse.json(
          { title: "Not Found", status: 404, traceId: "abc123" },
          { status: 404, headers: { "Content-Type": "application/problem+json" } },
        ),
      ),
    );
    const error = await apiFetch("/api/missing").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, message: "Not Found", traceId: "abc123" });
  });

  it("returns undefined for 204 No Content", async () => {
    server.use(http.delete(`${API_BASE_URL}/api/thing`, () => new HttpResponse(null, { status: 204 })));
    await expect(apiFetch("/api/thing", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("wraps connection failures in NetworkError", async () => {
    server.use(http.get(`${API_BASE_URL}/api/down`, () => HttpResponse.error()));
    await expect(apiFetch("/api/down")).rejects.toBeInstanceOf(NetworkError);
  });

  it.each(["api/relative", "//evil.example.com/x", "https://evil.example.com"])(
    "refuses non-API path %s",
    async (path) => {
      await expect(apiFetch(path)).rejects.toThrow(/absolute API path/);
    },
  );
});
