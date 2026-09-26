import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { BFF_BASE_URL } from "@/mocks/handlers";
import { server } from "@/mocks/server";

import { ApiError, NetworkError } from "./client";
import { api, unwrap, type Schema } from "./typed-client";

const WS = "3f6c2b1e-9a7d-4c21-8e0f-1b2c3d4e5f60";

describe("typed API client (OpenAPI-generated types)", () => {
  it("calls the BFF with typed params and returns typed data", async () => {
    let seen: { url: string; ws: string | null } | undefined;
    server.use(
      http.get(`${BFF_BASE_URL}/api/proposals`, ({ request }) => {
        seen = { url: request.url, ws: request.headers.get("x-workspace-id") };
        return HttpResponse.json({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
      }),
    );

    const page = await unwrap(
      api().GET("/api/proposals", {
        params: { header: { "X-Workspace-Id": WS }, query: { status: "DRAFT", page: 0 } },
      }),
    );

    expect(page.totalElements).toBe(0);
    expect(seen?.url).toBe(`${BFF_BASE_URL}/api/proposals?status=DRAFT&page=0`);
    expect(seen?.ws).toBe(WS);
  });

  it("throws ApiError with problem details, field errors and Retry-After", async () => {
    server.use(
      http.post(`${BFF_BASE_URL}/api/proposals`, () =>
        HttpResponse.json(
          {
            status: 400,
            title: "Bad Request",
            traceId: "t-1",
            errors: [{ field: "name", message: "must not be blank" }],
          },
          { status: 400, headers: { "Content-Type": "application/problem+json", "Retry-After": "30" } },
        ),
      ),
    );
    const body = { name: "" } as Schema<"CreateProposalRequest">;
    const error = await unwrap(
      api().POST("/api/proposals", { params: { header: { "X-Workspace-Id": WS } }, body }),
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      traceId: "t-1",
      fieldErrors: { name: "must not be blank" },
      retryAfterSeconds: 30,
    });
  });

  it("returns undefined for 204", async () => {
    server.use(http.delete(`${BFF_BASE_URL}/api/proposals/p1`, () => new HttpResponse(null, { status: 204 })));
    await expect(
      unwrap(
        api().DELETE("/api/proposals/{proposalId}", {
          params: { path: { proposalId: "p1" }, header: { "X-Workspace-Id": WS } },
        }),
      ),
    ).resolves.toBeUndefined();
  });

  it("wraps connection failures in NetworkError", async () => {
    server.use(http.get(`${BFF_BASE_URL}/api/me`, () => HttpResponse.error()));
    await expect(unwrap(api().GET("/api/me"))).rejects.toBeInstanceOf(NetworkError);
  });
});
