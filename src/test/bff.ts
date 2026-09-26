import { NextRequest } from "next/server";

export const APP_ORIGIN = "http://localhost:3000";

/** Build a same-origin browser request to a BFF route (cookies as `name=value` pairs). */
export function bffRequest(
  path: string,
  {
    method = "GET",
    cookies = {},
    json,
    headers = {},
    origin = APP_ORIGIN,
  }: {
    method?: string;
    cookies?: Record<string, string>;
    json?: unknown;
    headers?: Record<string, string>;
    origin?: string | null;
  } = {},
): NextRequest {
  const h = new Headers(headers);
  if (origin) h.set("origin", origin);
  const cookie = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  if (cookie) h.set("cookie", cookie);
  if (json !== undefined) h.set("content-type", "application/json");
  const body = json !== undefined ? JSON.stringify(json) : undefined;
  if (body) h.set("content-length", String(new TextEncoder().encode(body).length));
  return new NextRequest(`${APP_ORIGIN}${path}`, { method, headers: h, body });
}

export const TOKENS = {
  accessToken: "access-1",
  tokenType: "Bearer",
  expiresIn: 900,
  refreshToken: "refresh-1",
  refreshExpiresIn: 1_209_600,
};

export const RENEWED_TOKENS = { ...TOKENS, accessToken: "access-2", refreshToken: "refresh-2" };

/** Parsed Set-Cookie headers: name → { value, attrs }. */
export function setCookies(response: Response): Record<string, { value: string; attrs: string }> {
  const out: Record<string, { value: string; attrs: string }> = {};
  for (const line of response.headers.getSetCookie()) {
    const [pair, ...rest] = line.split(";");
    const idx = pair.indexOf("=");
    out[pair.slice(0, idx).trim()] = { value: pair.slice(idx + 1), attrs: rest.join(";").toLowerCase() };
  }
  return out;
}
