import { z } from "zod";

import { backendFetch, discard } from "./backend";

/** Cookie names (FDEC-03). Values are opaque tokens; never log them. */
export const ACCESS_COOKIE = "apg_at";
export const REFRESH_COOKIE = "apg_rt";

/*
 * Both cookies use Path=/ so `proxy.ts` can refresh an expired access token on a page
 * request. SameSite=Lax: sent on top-level GET navigations only; every state-changing
 * BFF route additionally checks the request origin (src/server/csrf.ts).
 */
const COOKIE_PATH = "/";
/** Drop the access cookie a little before the token expires so we refresh proactively. */
const ACCESS_EXPIRY_SKEW_S = 30;

export const tokenResponseSchema = z.object({
  accessToken: z.string().min(1),
  tokenType: z.string().optional(),
  expiresIn: z.number().int().positive(),
  refreshToken: z.string().min(1),
  refreshExpiresIn: z.number().int().positive(),
});

export type Tokens = z.infer<typeof tokenResponseSchema>;

interface CookieWriter {
  set(options: {
    name: string;
    value: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax";
    path: string;
    maxAge: number;
  }): unknown;
}

export function setSessionCookies(cookies: CookieWriter, tokens: Tokens): void {
  cookies.set({
    name: ACCESS_COOKIE,
    value: tokens.accessToken,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: Math.max(1, tokens.expiresIn - ACCESS_EXPIRY_SKEW_S),
  });
  cookies.set({
    name: REFRESH_COOKIE,
    value: tokens.refreshToken,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: tokens.refreshExpiresIn,
  });
}

export function clearSessionCookies(cookies: CookieWriter): void {
  const base = { value: "", httpOnly: true, secure: true, maxAge: 0 } as const;
  cookies.set({ ...base, name: ACCESS_COOKIE, sameSite: "lax", path: COOKIE_PATH });
  cookies.set({ ...base, name: REFRESH_COOKIE, sameSite: "lax", path: COOKIE_PATH });
}

export type RefreshResult = { ok: true; tokens: Tokens } | { ok: false; status: number };

/*
 * Single-flight per refresh token: concurrent requests with the same (rotating) refresh
 * token share one backend call, otherwise the second call would present an already-rotated
 * token and trip the API's reuse detection.
 */
const inFlight = new Map<string, Promise<RefreshResult>>();

export function refreshSession(refreshToken: string, clientIp?: string): Promise<RefreshResult> {
  const pending = inFlight.get(refreshToken);
  if (pending) return pending;

  const call = (async (): Promise<RefreshResult> => {
    try {
      const response = await backendFetch("/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(clientIp ? { "X-Forwarded-For": clientIp } : {}),
        },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) {
        discard(response);
        return { ok: false, status: response.status };
      }
      const parsed = tokenResponseSchema.safeParse(await response.json().catch(() => null));
      return parsed.success ? { ok: true, tokens: parsed.data } : { ok: false, status: 502 };
    } catch {
      return { ok: false, status: 503 };
    }
  })().finally(() => {
    // Keep the result briefly so requests racing right behind reuse it.
    const timer = setTimeout(() => inFlight.delete(refreshToken), 5_000);
    (timer as { unref?: () => void }).unref?.();
  });

  inFlight.set(refreshToken, call);
  return call;
}

/** Test helper. */
export function resetRefreshCache(): void {
  inFlight.clear();
}
