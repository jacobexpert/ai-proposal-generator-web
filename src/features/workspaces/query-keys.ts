/**
 * Query key conventions.
 *
 * Every query or mutation that sends `X-Workspace-Id` MUST use `workspaceKey(workspaceId, …)`:
 * the id in the key keeps workspaces' caches apart, switching workspaces drops everything
 * under `["ws"]`, and a 404 on such a key re-checks the user's memberships (US-FE-03 AC4).
 */
export const meKey = ["me"] as const;

export const WORKSPACE_SCOPE = "ws";

export function workspaceKey<const Rest extends readonly unknown[]>(workspaceId: string, ...rest: Rest) {
  return [WORKSPACE_SCOPE, workspaceId, ...rest] as const;
}

/** The workspace a key belongs to, if it is workspace-scoped. */
export function workspaceOfKey(key: readonly unknown[] | undefined): string | undefined {
  return key?.[0] === WORKSPACE_SCOPE && typeof key[1] === "string" ? key[1] : undefined;
}

/** `params.header` for workspace-scoped endpoints of the typed client. */
export const workspaceHeader = (workspaceId: string) => ({ "X-Workspace-Id": workspaceId }) as const;
