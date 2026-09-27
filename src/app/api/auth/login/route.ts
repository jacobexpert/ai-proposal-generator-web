import { NextResponse, type NextRequest } from "next/server";

import { loginSchema } from "@/features/auth/schemas";
import { backendFetch, forwardedFor, problem, relayError, validationProblem } from "@/server/backend";
import { isSameOriginRequest } from "@/server/csrf";
import { setSessionCookies, tokenResponseSchema } from "@/server/session";

/**
 * POST /api/auth/login — exchanges credentials with the API and stores the tokens in
 * HttpOnly cookies. The response body never contains a token (FDEC-03, US-FE-02 AC6).
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return problem(403, "Forbidden", "Cross-site request rejected.");

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationProblem(parsed.error.issues);

  const clientIp = forwardedFor(request);
  let response: Response;
  try {
    response = await backendFetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(clientIp ? { "X-Forwarded-For": clientIp } : {}),
      },
      body: JSON.stringify(parsed.data),
    });
  } catch {
    return problem(503, "Service Unavailable", "The server could not be reached.");
  }

  if (!response.ok) return relayError(response);

  const tokens = tokenResponseSchema.safeParse(await response.json().catch(() => null));
  if (!tokens.success) return problem(502, "Bad Gateway", "Unexpected response from the server.");

  const res = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  setSessionCookies(res.cookies, tokens.data);
  return res;
}
