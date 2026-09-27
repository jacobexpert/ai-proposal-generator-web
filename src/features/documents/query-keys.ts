import { workspaceKey } from "@/features/workspaces";

/** Documents of one proposal (the list itself arrives with US-FE-09). */
export function documentsKey(workspaceId: string, proposalId: string) {
  return workspaceKey(workspaceId, "proposals", proposalId, "documents");
}
