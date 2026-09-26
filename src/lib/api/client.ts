/** RFC 9457 Problem Details as returned by the backend (plus its `traceId` extension). */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  traceId?: string;
  /** Field errors, only for request validation failures (400). */
  errors?: { field?: string; message?: string }[];
  [extension: string]: unknown;
}

/** Same-origin BFF prefix (FDEC-03): the browser never calls the API host directly. */
export const BFF_API_PREFIX = "/api/backend";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly problem: ProblemDetail | null,
  ) {
    super(problem?.title ?? `Request failed with status ${status}`);
    this.name = "ApiError";
  }

  get traceId(): string | undefined {
    return typeof this.problem?.traceId === "string" ? this.problem.traceId : undefined;
  }

  /** `{ field: message }` from a 400 validation problem; empty when none. */
  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const e of Array.isArray(this.problem?.errors) ? this.problem.errors : []) {
      if (typeof e?.field === "string" && typeof e?.message === "string") out[e.field] ??= e.message;
    }
    return out;
  }
}

/** Thrown when the API cannot be reached at all (offline, DNS, CORS, backend down). */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super("The server could not be reached.", { cause });
    this.name = "NetworkError";
  }
}

export interface ApiRequestInit extends Omit<RequestInit, "body"> {
  /** JSON-serialisable body; sent with `Content-Type: application/json`. */
  json?: unknown;
}

/**
 * Browser-side fetch wrapper for backend API calls. Requests go to the same-origin BFF
 * (`/api/backend/*`), which attaches the session token from its HttpOnly cookie.
 * `X-Workspace-Id` and the shared error mapping are added in US-FE-03 / US-FE-04.
 */
export async function apiFetch<T>(
  path: string,
  { json, headers, ...init }: ApiRequestInit = {},
  baseUrl: string = defaultBaseUrl(),
): Promise<T> {
  if (!path.startsWith("/") || path.startsWith("//")) {
    // Only same-API relative paths: never let a caller turn this into an arbitrary URL.
    throw new Error(`apiFetch expects an absolute API path, got "${path}"`);
  }

  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json, application/problem+json");
  if (json !== undefined) requestHeaders.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: requestHeaders,
      credentials: "same-origin",
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new NetworkError(error);
  }

  const body = await readBody(response);
  if (!response.ok) {
    throw new ApiError(response.status, isObject(body) ? (body as ProblemDetail) : null);
  }
  return body as T;
}

function defaultBaseUrl(): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${BFF_API_PREFIX}`;
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  const type = response.headers.get("Content-Type") ?? "";
  if (type.includes("json")) {
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
