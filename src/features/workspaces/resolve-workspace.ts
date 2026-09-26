import type { WorkspaceItem } from "./api";

/**
 * Which workspace to work in (US-FE-03 AC3–AC5): the selected one while the user is still a
 * member, otherwise the first remaining one, or none.
 */
export function resolveWorkspace(
  workspaces: readonly WorkspaceItem[],
  selectedId: string | undefined,
): WorkspaceItem | undefined {
  return workspaces.find((w) => w.id === selectedId) ?? workspaces[0];
}
