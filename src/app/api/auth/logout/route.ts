import { NextResponse, type NextRequest } from "next/server";

import { backendFetch, discard, forwardedFor, problem } from "@/server/backend";
import { isSameOriginRequest } from "@/server/csrf";
import { WORKSPACE_COOKIE } from "@/features/workspaces/workspace-cookie";
import { ACCESS_COOKIE, REFRESH_COOKIE, clearSessionCookies, refreshSession } from "@/server/session";

/**
 * POST /api/auth/logout — revokes the session in the API (best effort) and always clears
 * the session cookies (and the remembered workspace). If the access token already expired, it is refreshed first so the
 * refresh-token session is revoked too.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return problem(403, "Forbidden", "Cross-site request rejected.");

  const clientIp = forwardedFor(request);
  let accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  let refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (!accessToken && refreshToken) {
    const refreshed = await refreshSession(refreshToken, clientIp);
    if (refreshed.ok) {
      accessToken = refreshed.tokens.accessToken;
      refreshToken = refreshed.tokens.refreshToken;
    }
  }

  if (accessToken) {
    try {
      const response = await backendFetch("/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...(clientIp ? { "X-Forwarded-For": clientIp } : {}),
        },
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      });
      discard(response); // 204, or a Problem Details body we do not need
    } catch {
      // Best effort: the cookies are cleared regardless, tokens expire on their own.
    }
  }

  const res = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  clearSessionCookies(res.cookies);
  // The next person to sign in on this browser starts from their own first workspace.
  res.cookies.set({ name: WORKSPACE_COOKIE, value: "", path: "/", maxAge: 0 });
  return res;
}
