import { z } from "zod";

import { api, unwrap, type Schema } from "@/lib/api/typed-client";

/*
 * The OpenAPI marks every response field optional, so the payload is checked here before
 * the UI relies on it (never trust server output blindly).
 */
export const workspaceRoleSchema = z.enum(["OWNER", "MEMBER"]);

const workspaceItemSchema = z.object({
  id: z.guid(),
  name: z.string(),
  role: workspaceRoleSchema,
});

const meSchema = z.object({
  id: z.guid(),
  email: z.string(),
  displayName: z.string(),
  status: z.string().optional(),
  workspaces: z.array(workspaceItemSchema),
});

export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;
export type WorkspaceItem = z.infer<typeof workspaceItemSchema> & Schema<"WorkspaceItem">;
export type CurrentUser = z.infer<typeof meSchema> & Schema<"MeResponse">;

/** `GET /api/me`: the signed-in user and the workspaces they belong to. */
export async function fetchCurrentUser(signal?: AbortSignal): Promise<CurrentUser> {
  const data = await unwrap(api().GET("/api/me", { signal }));
  const me = meSchema.parse(data);
  return { ...me, workspaces: me.workspaces.map((w) => ({ ...w, id: w.id.toLowerCase() })) };
}
