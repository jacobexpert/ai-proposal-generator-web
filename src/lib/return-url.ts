const PLACEHOLDER_ORIGIN = "http://return-url.invalid";
const AUTH_PAGES = new Set(["/login"]);

/**
 * Only same-app relative paths are allowed as a post-login destination (no open redirect):
 * must start with a single "/", no protocol-relative "//" or "/\", no control characters,
 * and never an auth page (avoids redirect loops). Anything else yields `fallback`.
 */
export function safeReturnUrl(value: string | null | undefined, fallback = "/"): string {
  if (!value || value.length > 2048) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;

  try {
    const url = new URL(value, PLACEHOLDER_ORIGIN);
    if (url.origin !== PLACEHOLDER_ORIGIN) return fallback;
    if (AUTH_PAGES.has(url.pathname)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function loginUrl(returnTo?: string): string {
  const target = safeReturnUrl(returnTo, "");
  return target && target !== "/" ? `/login?returnUrl=${encodeURIComponent(target)}` : "/login";
}
