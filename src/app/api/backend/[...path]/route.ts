import { NextResponse, type NextRequest } from "next/server";

import { serverEnv } from "@/config/env";
import { backendFetch, discard, forwardedFor, problem } from "@/server/backend";
import { isSameOriginRequest } from "@/server/csrf";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearSessionCookies,
  refreshSession,
  setSessionCookies,
  type Tokens,
} from "@/server/session";

/**
 * BFF proxy (FDEC-03): /api/backend/<path> → API /<path>, with the access token taken from
 * the HttpOnly cookie. Only allow-listed API paths are reachable (no SSRF / path traversal);
 * the API itself still enforces authentication, authorization and tenant isolation.
 */

type RouteContext = { params: Promise<{ path: string[] }> };

/** `api/**` except the auth endpoints (handled by /api/auth/*), plus the public health check. */
const ALLOWED_PATHS = [/^api\/(?!auth(?:\/|$))[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*$/, /^actuator\/health$/];
const SEGMENT = /^[A-Za-z0-9._~-]+$/;
const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/** Request headers copied to the API. Everything else (cookies, Authorization, Host…) is dropped. */
const FORWARDED_REQUEST_HEADERS = ["accept", "content-type", "if-match", "if-none-match", "x-request-id"];
/**
 * Response headers copied back to the browser. `WWW-Authenticate` stays server-side: the
 * browser authenticates with cookies, and its `error_description` would only leak internals.
 */
const FORWARDED_RESPONSE_HEADERS = [
  "content-type",
  "content-length",
  "content-disposition",
  "etag",
  "last-modified",
  "retry-after",
  "x-request-id",
];
/** JSON bodies up to this size are buffered so the request can be retried after a token refresh. */
const MAX_BUFFERED_BODY = 1024 * 1024;

function resolvePath(segments: string[]): string | null {
  if (segments.length === 0) return null;
  if (!segments.every((s) => SEGMENT.test(s) && s !== "." && s !== "..")) return null;
  const path = segments.join("/");
  return ALLOWED_PATHS.some((re) => re.test(path)) ? path : null;
}

function buildHeaders(request: NextRequest, accessToken: string | undefined, clientIp: string | undefined): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const workspaceId = request.headers.get("x-workspace-id");
  if (workspaceId && UUID.test(workspaceId)) headers.set("X-Workspace-Id", workspaceId);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (clientIp) headers.set("X-Forwarded-For", clientIp);
  return headers;
}

async function readBody(
  request: NextRequest,
): Promise<{ body: BodyInit | undefined; replayable: boolean; stream: boolean }> {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || !request.body)
    return { body: undefined, replayable: true, stream: false };

  const contentType = request.headers.get("content-type") ?? "";
  const length = Number(request.headers.get("content-length") ?? "NaN");
  const small = Number.isFinite(length) && length <= MAX_BUFFERED_BODY;
  if (!contentType.startsWith("multipart/") && small) {
    return { body: await request.arrayBuffer(), replayable: true, stream: false };
  }
  // Uploads are streamed straight through (never buffered in memory) and cannot be replayed.
  return { body: request.body, replayable: false, stream: true };
}

function toBrowserResponse(upstream: Response): NextResponse {
  if (upstream.status >= 300 && upstream.status < 400) {
    return NextResponse.json(
      { type: "about:blank", title: "Bad Gateway", status: 502 },
      { status: 502, headers: { "Content-Type": "application/problem+json" } },
    );
  }
  const headers = new Headers({ "Cache-Control": "no-store" });
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  const location = upstream.headers.get("location");
  if (location?.startsWith("/api/")) headers.set("Location", `/api/backend${location}`);
  const body = upstream.status === 204 || upstream.status === 304 ? null : upstream.body;
  return new NextResponse(body, { status: upstream.status, headers });
}

async function handle(request: NextRequest, context: RouteContext): Promise<Response> {
  const path = resolvePath((await context.params).path);
  if (!path) return problem(404, "Not Found");
  if (!isSameOriginRequest(request)) return problem(403, "Forbidden", "Cross-site request rejected.");

  const clientIp = forwardedFor(request);
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  let accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  let renewed: Tokens | undefined;
  let sessionEnded = false;

  // Access cookie expired (it is dropped just before the token expires): refresh first.
  if (!accessToken && refreshToken) {
    const result = await refreshSession(refreshToken, clientIp);
    if (result.ok) {
      renewed = result.tokens;
      accessToken = result.tokens.accessToken;
    } else if (result.status === 400 || result.status === 401) {
      sessionEnded = true;
    }
  }

  const { body, replayable, stream } = await readBody(request);
  const target = `/${path}${request.nextUrl.search}`;
  const send = (token: string | undefined) =>
    backendFetch(target, {
      method: request.method,
      headers: buildHeaders(request, token, clientIp),
      body,
      // Uploads are streamed and get the longer upload timeout (US-FE-08).
      ...(stream ? { duplex: "half" as const, timeoutMs: serverEnv().API_UPLOAD_TIMEOUT_MS } : {}),
      signal: request.signal,
    });

  let upstream: Response;
  try {
    upstream = await send(accessToken);
    // Token rejected (e.g. revoked or expired in flight): refresh once and replay.
    if (upstream.status === 401 && replayable && refreshToken && !renewed) {
      const result = await refreshSession(refreshToken, clientIp);
      if (result.ok) {
        renewed = result.tokens;
        discard(upstream);
        upstream = await send(result.tokens.accessToken);
      } else {
        sessionEnded = true;
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError" && request.signal.aborted) {
      return new Response(null, { status: 499 });
    }
    // Not "unreachable": the API may still have done the work (e.g. stored an upload).
    if (error instanceof DOMException && error.name === "TimeoutError") {
      return problem(504, "Gateway Timeout", "The server took too long to respond.");
    }
    return problem(503, "Service Unavailable", "The server could not be reached.");
  }

  const response = toBrowserResponse(upstream);
  if (upstream.status === 401 && (accessToken || refreshToken)) sessionEnded = true;
  if (sessionEnded) clearSessionCookies(response.cookies);
  else if (renewed) setSessionCookies(response.cookies, renewed);
  return response;
}

export { handle as DELETE, handle as GET, handle as PATCH, handle as POST, handle as PUT };
