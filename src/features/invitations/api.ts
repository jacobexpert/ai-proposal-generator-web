import { z } from "zod";

import { api, unwrap } from "@/lib/api/typed-client";

const roleSchema = z.enum(["OWNER", "MEMBER"]);

const previewSchema = z.object({
  workspaceName: z.string(),
  email: z.string(),
  role: roleSchema,
  expiresAt: z.string(),
});

const joinedSchema = z.object({ id: z.guid(), name: z.string(), role: roleSchema });

export type InvitationPreview = z.infer<typeof previewSchema>;
export type JoinedWorkspace = z.infer<typeof joinedSchema>;

/** Public: what the invitation is for. 404 = invalid, expired, used or revoked (BR-08). */
export async function lookupInvitation(token: string, signal?: AbortSignal): Promise<InvitationPreview> {
  return previewSchema.parse(await unwrap(api().POST("/api/invitations/lookup", { body: { token }, signal })));
}

/** Signed in: join the workspace. 403 = other email, 404 = invalid, 409 = already a member. */
export async function acceptInvitation(token: string): Promise<JoinedWorkspace> {
  const joined = joinedSchema.parse(await unwrap(api().POST("/api/invitations/accept", { body: { token } })));
  return { ...joined, id: joined.id.toLowerCase() };
}
