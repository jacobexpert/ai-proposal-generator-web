import { z } from "zod";

import { workspaceRoleSchema, type WorkspaceRole } from "@/features/workspaces";
import { api, unwrap } from "@/lib/api/typed-client";

/* Response shapes are checked: the OpenAPI marks every field optional. */
const memberSchema = z.object({
  userId: z.guid(),
  email: z.string(),
  displayName: z.string(),
  role: workspaceRoleSchema,
  joinedAt: z.string(),
});

const invitationSchema = z.object({
  id: z.guid(),
  email: z.string(),
  role: workspaceRoleSchema,
  status: z.enum(["PENDING", "ACCEPTED", "REVOKED"]),
  expiresAt: z.string(),
  createdAt: z.string(),
});

const createdInvitationSchema = z.object({
  id: z.guid(),
  email: z.string(),
  role: workspaceRoleSchema,
  expiresAt: z.string(),
  invitationToken: z.string().min(1),
  invitationUrl: z.string().optional(),
});

export type Member = z.infer<typeof memberSchema>;
export type Invitation = z.infer<typeof invitationSchema>;
export type CreatedInvitation = z.infer<typeof createdInvitationSchema> & { link: string };

const path = (workspaceId: string) => ({ path: { workspaceId } });

export async function listMembers(workspaceId: string, signal?: AbortSignal): Promise<Member[]> {
  const data = await unwrap(api().GET("/api/workspaces/{workspaceId}/members", { params: path(workspaceId), signal }));
  return z.array(memberSchema).parse(data);
}

/** OWNER only (403 otherwise). Pending, unexpired invitations; never includes the token. */
export async function listInvitations(workspaceId: string, signal?: AbortSignal): Promise<Invitation[]> {
  const data = await unwrap(
    api().GET("/api/workspaces/{workspaceId}/invitations", { params: path(workspaceId), signal }),
  );
  return z.array(invitationSchema).parse(data);
}

/**
 * The link to share: the API's `invitationUrl` when it is a proper http(s) URL to our
 * accept page, otherwise built from the token on this origin.
 */
export function invitationLink(created: { invitationToken: string; invitationUrl?: string }): string {
  if (created.invitationUrl) {
    try {
      const url = new URL(created.invitationUrl);
      if ((url.protocol === "https:" || url.protocol === "http:") && url.pathname.endsWith("/invitations/accept"))
        return url.toString();
    } catch {
      // fall through
    }
  }
  const url = new URL("/invitations/accept", window.location.origin);
  url.searchParams.set("token", created.invitationToken);
  return url.toString();
}

/** OWNER. 201 with a one-time token; 409 = already a member; re-inviting replaces a pending invitation. */
export async function inviteMember(
  workspaceId: string,
  body: { email: string; role: WorkspaceRole },
): Promise<CreatedInvitation> {
  const data = await unwrap(
    api().POST("/api/workspaces/{workspaceId}/invitations", { params: path(workspaceId), body }),
  );
  const created = createdInvitationSchema.parse(data);
  return { ...created, link: invitationLink(created) };
}

export async function revokeInvitation(workspaceId: string, invitationId: string): Promise<void> {
  await unwrap(
    api().DELETE("/api/workspaces/{workspaceId}/invitations/{invitationId}", {
      params: { path: { workspaceId, invitationId } },
    }),
  );
}

/** OWNER. 409 = would leave the workspace without an owner (BR-09). */
export async function changeMemberRole(workspaceId: string, userId: string, role: WorkspaceRole): Promise<void> {
  await unwrap(
    api().PATCH("/api/workspaces/{workspaceId}/members/{userId}", {
      params: { path: { workspaceId, userId } },
      body: { role },
    }),
  );
}

/** OWNER (or the member themselves, see US-FE-45). 409 = last owner. */
export async function removeMember(workspaceId: string, userId: string): Promise<void> {
  await unwrap(
    api().DELETE("/api/workspaces/{workspaceId}/members/{userId}", { params: { path: { workspaceId, userId } } }),
  );
}
