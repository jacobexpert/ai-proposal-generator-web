/**
 * The workspace a user last worked in (US-FE-03 AC3). Only a preference: the id is always
 * re-checked against the user's memberships (`GET /api/me`) before it is used, and the API
 * enforces membership on every request. Not secret, so the browser may write it.
 */
export const WORKSPACE_COOKIE = "apg_ws";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ONE_YEAR = 60 * 60 * 24 * 365;

/** A valid workspace id, or undefined for anything else. */
export function parseWorkspaceId(value: string | undefined | null): string | undefined {
  return value && UUID.test(value) ? value.toLowerCase() : undefined;
}

/** Remember the workspace for the next page load (browser only). */
export function rememberWorkspace(id: string): void {
  const workspaceId = parseWorkspaceId(id);
  if (!workspaceId || typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${WORKSPACE_COOKIE}=${workspaceId}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax${secure}`;
}
