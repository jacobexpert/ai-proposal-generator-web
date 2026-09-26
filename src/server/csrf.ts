const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF guard for cookie-authenticated BFF routes (FDEC-03): state-changing requests must
 * come from this app's own origin. Uses `Sec-Fetch-Site` when the browser sends it, and
 * falls back to comparing `Origin` with the request origin. Requests with neither header
 * are rejected for unsafe methods.
 */
export function isSameOriginRequest(request: Request): boolean {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) return fetchSite === "same-origin";

  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
