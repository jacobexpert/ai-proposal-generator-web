import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { registerRequestSchema } from "@/features/auth/schemas";
import { WORKSPACE_COOKIE } from "@/features/workspaces/workspace-cookie";
import { backendFetch, forwardedFor, problem, relayError, validationProblem } from "@/server/backend";
import { isSameOriginRequest } from "@/server/csrf";
import { setSessionCookies, tokenResponseSchema } from "@/server/session";

const registrationResponseSchema = tokenResponseSchema.extend({ workspaceId: z.guid() });

/**
 * POST /api/auth/register (US-FE-42) — creates the account and signs the user in like
 * /api/auth/login: tokens go to HttpOnly cookies, never to the browser. The new workspace
 * becomes the remembered one (US-FE-03 AC5). The password is never logged.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return problem(403, "Forbidden", "Cross-site request rejected.");

  const parsed = registerRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationProblem(parsed.error.issues);

  const clientIp = forwardedFor(request);
  let response: Response;
  try {
    response = await backendFetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        // Registration is rate-limited per client IP (BR-10).
        ...(clientIp ? { "X-Forwarded-For": clientIp } : {}),
      },
      body: JSON.stringify(parsed.data),
    });
  } catch {
    return problem(503, "Service Unavailable", "The server could not be reached.");
  }

  if (!response.ok) return relayError(response);

  const result = registrationResponseSchema.safeParse(await response.json().catch(() => null));
  if (!result.success) return problem(502, "Bad Gateway", "Unexpected response from the server.");

  const workspaceId = result.data.workspaceId.toLowerCase();
  const res = NextResponse.json({ workspaceId }, { status: 201, headers: { "Cache-Control": "no-store" } });
  setSessionCookies(res.cookies, result.data);
  // Same attributes as `rememberWorkspace()` in the browser: a preference, not a secret.
  res.cookies.set({
    name: WORKSPACE_COOKIE,
    value: workspaceId,
    path: "/",
    sameSite: "lax",
    secure: true,
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
