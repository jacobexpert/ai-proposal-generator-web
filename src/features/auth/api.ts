import { ApiError, NetworkError, parseRetryAfter, type ProblemDetail } from "@/lib/api/client";

import type { LoginInput } from "./schemas";

/** Browser → BFF auth calls (same origin). Tokens never reach JavaScript: the BFF sets HttpOnly cookies. */
async function postAuth(path: "/api/auth/login" | "/api/auth/logout", body?: unknown): Promise<void> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: { Accept: "application/json", ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new NetworkError(error);
  }
  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as ProblemDetail | null;
    throw new ApiError(response.status, problem, parseRetryAfter(response.headers.get("retry-after")));
  }
}

export const login = (input: LoginInput) => postAuth("/api/auth/login", input);
export const logout = () => postAuth("/api/auth/logout");
