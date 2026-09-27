/**
 * The invitation token (a one-time secret) lives in the URL only on arrival: it is moved to
 * sessionStorage (this tab only, gone when the tab closes) and stripped from the address bar
 * so it does not end up in history, bookmarks, screenshots or Referer headers (US-FE-43 AC1).
 */
const KEY = "apg.invitation-token";

/** Tokens are opaque URL-safe strings; anything else is ignored. */
export function parseInvitationToken(value: string | null | undefined): string | undefined {
  return value && /^[A-Za-z0-9._~-]{1,256}$/.test(value) ? value : undefined;
}

export function readStoredToken(): string | undefined {
  try {
    return parseInvitationToken(window.sessionStorage.getItem(KEY));
  } catch {
    return undefined;
  }
}

export function storeToken(token: string): void {
  try {
    window.sessionStorage.setItem(KEY, token);
  } catch {
    // Private mode / storage disabled: the flow still works in this page load.
  }
}

export function clearStoredToken(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** Remove `?token=` from the address bar without a navigation. */
export function stripTokenFromUrl(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("token")) return;
  url.searchParams.delete("token");
  // `null` state: Next.js then syncs its router with the new URL (a later refresh keeps it clean).
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}
