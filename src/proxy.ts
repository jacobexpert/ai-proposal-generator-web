import { NextResponse, type NextRequest } from "next/server";

import { safeReturnUrl } from "@/lib/return-url";
import { forwardedFor } from "@/server/backend";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearSessionCookies,
  refreshSession,
  setSessionCookies,
  type Tokens,
} from "@/server/session";

/** Pages reachable without a session. */
const PUBLIC_PATHS = new Set(["/login"]);

/**
 * Route protection (US-FE-02 AC1). This is a UX guard only: every API call is still
 * authorised by the backend. An expired access cookie is renewed here with the refresh
 * cookie so a page load after 15 minutes does not bounce the user to the login page.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.has(pathname);

  let hasSession = request.cookies.has(ACCESS_COOKIE);
  let renewed: Tokens | undefined;
  let ended = false;

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!hasSession && refreshToken) {
    const result = await refreshSession(refreshToken, forwardedFor(request));
    if (result.ok) {
      renewed = result.tokens;
      hasSession = true;
    } else {
      ended = result.status === 400 || result.status === 401;
    }
  }

  let response: NextResponse;
  if (hasSession && isPublic) {
    // Already signed in: leave the login page.
    const target = safeReturnUrl(request.nextUrl.searchParams.get("returnUrl"));
    response = NextResponse.redirect(new URL(target, request.url));
  } else if (!hasSession && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    const returnUrl = safeReturnUrl(`${pathname}${search}`, "");
    if (returnUrl && returnUrl !== "/") loginUrl.searchParams.set("returnUrl", returnUrl);
    response = NextResponse.redirect(loginUrl);
  } else if (renewed) {
    // Make the renewed access token visible to Server Components in this same request.
    const headers = new Headers(request.headers);
    request.cookies.set(ACCESS_COOKIE, renewed.accessToken);
    request.cookies.set(REFRESH_COOKIE, renewed.refreshToken);
    headers.set("cookie", request.cookies.toString());
    response = NextResponse.next({ request: { headers } });
  } else {
    response = NextResponse.next();
  }

  if (renewed) setSessionCookies(response.cookies, renewed);
  else if (ended) clearSessionCookies(response.cookies);
  return response;
}

export const config = {
  // Pages only: skip BFF routes, Next internals and static files.
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
