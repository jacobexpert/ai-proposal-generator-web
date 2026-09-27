import { serverEnv } from "@/config/env";

/**
 * Server-side call from the BFF to the Spring Boot API. Only used by route handlers /
 * `proxy.ts`; never from the browser. Redirects are not followed (no open redirect /
 * SSRF through a 3xx), and every call has a timeout.
 */
export async function backendFetch(path: string, init: RequestInit & { duplex?: "half" } = {}): Promise<Response> {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error(`backendFetch expects an absolute API path, got "${path}"`);
  }
  const { API_BASE_URL, API_TIMEOUT_MS } = serverEnv();
  const signal = init.signal
    ? AbortSignal.any([init.signal, AbortSignal.timeout(API_TIMEOUT_MS)])
    : AbortSignal.timeout(API_TIMEOUT_MS);
  return fetch(`${API_BASE_URL}${path}`, { ...init, redirect: "manual", cache: "no-store", signal });
}

/**
 * Client IP to forward to the API so its per-IP limits keep working (FDEC-03).
 * Takes the LAST `X-Forwarded-For` entry: the one appended by our own ingress (Azure
 * Container Apps). Earlier entries are client-controlled and could be spoofed.
 */
export function forwardedFor(request: Request): string | undefined {
  const last = request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return last && /^[0-9a-fA-F:.]{2,45}$/.test(last) ? last : undefined;
}

/** JSON Problem Details response (RFC 9457) produced by the BFF itself. */
export function problem(status: number, title: string, detail?: string): Response {
  return Response.json(
    { type: "about:blank", title, status, ...(detail ? { detail } : {}) },
    { status, headers: { "Content-Type": "application/problem+json", "Cache-Control": "no-store" } },
  );
}

/** 400 Problem Details with field errors, in the API's shape (`errors[{field, message}]`). */
export function validationProblem(issues: readonly { path: readonly PropertyKey[]; message: string }[]): Response {
  return Response.json(
    {
      type: "about:blank",
      title: "Bad Request",
      status: 400,
      errors: issues.map((i) => ({ field: String(i.path[0] ?? ""), message: i.message })),
    },
    { status: 400, headers: { "Content-Type": "application/problem+json", "Cache-Control": "no-store" } },
  );
}

const RELAYED_ERROR_HEADERS = ["content-type", "retry-after", "x-request-id"];

/** Relay an API error response (status + Problem Details body + Retry-After) to the browser. */
export async function relayError(response: Response): Promise<Response> {
  const headers = new Headers({ "Cache-Control": "no-store" });
  for (const name of RELAYED_ERROR_HEADERS) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(await response.text(), { status: response.status, headers });
}
