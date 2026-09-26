import createClient, { type Client } from "openapi-fetch";

import { ApiError, NetworkError, defaultBaseUrl, isObject, parseRetryAfter, type ProblemDetail } from "./client";
import type { components, paths } from "./schema";

/**
 * Typed API client generated from the backend OpenAPI (US-FE-04 AC1): paths, params and
 * bodies come from `schema.d.ts` (`npm run api:spec && npm run api:types`) — never hand-write
 * request/response types. Calls go through the same-origin BFF (FDEC-03).
 *
 * Workspace-scoped endpoints declare `X-Workspace-Id` as a required header, so the workspace
 * is always passed explicitly by the caller (and belongs in the query key).
 */
let client: Client<paths> | undefined;

export function api(): Client<paths> {
  client ??= createClient<paths>({
    baseUrl: defaultBaseUrl(),
    credentials: "same-origin",
    headers: { Accept: "application/json, application/problem+json" },
  });
  return client;
}

/** Schema helper: `Schema<"ProposalResponse">`. */
export type Schema<Name extends keyof components["schemas"]> = components["schemas"][Name];

interface FetchResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

/**
 * Resolve an openapi-fetch call to its data, or throw the same `ApiError` / `NetworkError`
 * as `apiFetch`, so screens handle errors one way:
 * `const proposal = await unwrap(api().GET("/api/proposals/{proposalId}", { params }))`.
 */
export async function unwrap<T>(call: Promise<FetchResult<T>>): Promise<T> {
  let result: FetchResult<T>;
  try {
    result = await call;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new NetworkError(error);
  }
  const { data, error, response } = result;
  if (!response.ok || error !== undefined) {
    throw new ApiError(
      response.status,
      isObject(error) ? (error as ProblemDetail) : null,
      parseRetryAfter(response.headers.get("retry-after")),
    );
  }
  return data as T;
}

/** Test helper: forget the memoised client (e.g. after changing the jsdom origin). */
export function resetApiClient(): void {
  client = undefined;
}
