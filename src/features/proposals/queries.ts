"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { workspaceKey } from "@/features/workspaces";

import { getProposal, getTemplate, listProposals, listTemplates, type ProposalListParams } from "./api";

export const proposalsKey = (workspaceId: string) => workspaceKey(workspaceId, "proposals");
export const proposalKey = (workspaceId: string, proposalId: string) =>
  workspaceKey(workspaceId, "proposal", proposalId);
export const templatesKey = (workspaceId: string) => workspaceKey(workspaceId, "templates");
export const templateKey = (workspaceId: string, templateId: string) =>
  workspaceKey(workspaceId, "template", templateId);

export function useProposals(workspaceId: string, params: ProposalListParams) {
  return useQuery({
    queryKey: [...proposalsKey(workspaceId), params],
    queryFn: ({ signal }) => listProposals(workspaceId, params, signal),
    placeholderData: keepPreviousData, // keep the table while the next page/filter loads
  });
}

export function useProposal(workspaceId: string, proposalId: string | undefined) {
  return useQuery({
    queryKey: proposalKey(workspaceId, proposalId ?? ""),
    queryFn: ({ signal }) => getProposal(workspaceId, proposalId!, signal),
    enabled: !!proposalId,
  });
}

export function useTemplates(workspaceId: string) {
  return useQuery({ queryKey: templatesKey(workspaceId), queryFn: ({ signal }) => listTemplates(workspaceId, signal) });
}

export function useTemplate(workspaceId: string, templateId: string | undefined) {
  return useQuery({
    queryKey: templateKey(workspaceId, templateId ?? ""),
    queryFn: ({ signal }) => getTemplate(workspaceId, templateId!, signal),
    enabled: !!templateId,
  });
}
