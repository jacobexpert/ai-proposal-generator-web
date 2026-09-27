"use client";

import { useQuery } from "@tanstack/react-query";

import { workspaceKey } from "@/features/workspaces";

import { listInvitations, listMembers } from "./api";

export const membersKey = (workspaceId: string) => workspaceKey(workspaceId, "members");
export const invitationsKey = (workspaceId: string) => workspaceKey(workspaceId, "invitations");

export function useMembers(workspaceId: string) {
  return useQuery({ queryKey: membersKey(workspaceId), queryFn: ({ signal }) => listMembers(workspaceId, signal) });
}

/** Only fetched for owners (the API answers 403 to members). */
export function useInvitations(workspaceId: string, enabled: boolean) {
  return useQuery({
    queryKey: invitationsKey(workspaceId),
    queryFn: ({ signal }) => listInvitations(workspaceId, signal),
    enabled,
  });
}
