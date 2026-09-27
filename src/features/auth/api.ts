import { z } from "zod";

import { ApiError, NetworkError, parseRetryAfter, type ProblemDetail } from "@/lib/api/client";

import type { LoginInput, RegisterRequest } from "./schemas";

/** Browser → BFF auth calls (same origin). Tokens never reach JavaScript: the BFF sets HttpOnly cookies. */
async function postAuth(
  path: "/api/auth/login" | "/api/auth/logout" | "/api/auth/register",
  body?: unknown,
): Promise<Response> {
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
  return response;
}

export const login = async (input: LoginInput) => void (await postAuth("/api/auth/login", input));
export const logout = async () => void (await postAuth("/api/auth/logout"));

const registeredSchema = z.object({ workspaceId: z.guid() });

/** Creates the account and signs in (the BFF sets the session cookies). Returns the new workspace. */
export async function register(input: RegisterRequest): Promise<{ workspaceId: string }> {
  const response = await postAuth("/api/auth/register", input);
  return registeredSchema.parse(await response.json());
}
