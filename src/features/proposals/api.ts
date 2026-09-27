import { z } from "zod";

import { workspaceHeader } from "@/features/workspaces";
import { api, unwrap } from "@/lib/api/typed-client";

import { PROPOSAL_STATUSES } from "./status";

const statusSchema = z.enum(PROPOSAL_STATUSES);
/* Every field is optional in the OpenAPI, so responses are validated before use. */
const optionalText = z.string().nullish();

const summarySchema = z.object({
  id: z.guid(),
  name: z.string(),
  customerName: z.string(),
  status: statusSchema,
  deadline: z.string().nullish(),
  updatedAt: z.string(),
});

const pageSchema = z.object({
  items: z.array(summarySchema),
  page: z.number().int(),
  size: z.number().int(),
  totalElements: z.number().int(),
  totalPages: z.number().int(),
});

export const proposalSchema = z.object({
  id: z.guid(),
  name: z.string(),
  customerName: z.string(),
  customerIndustry: z.string(),
  opportunityDescription: z.string(),
  deadline: z.string(),
  language: z.string(),
  currency: z.string(),
  templateId: z.guid(),
  customerWebsite: optionalText,
  accountManager: optionalText,
  solutionArchitect: optionalText,
  salesOwner: optionalText,
  opportunityValue: z.number().nullish(),
  internalNotes: optionalText,
  status: statusSchema,
  previousStatus: statusSchema.nullish(),
  createdBy: z.guid().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int(),
});

const templateSummarySchema = z.object({
  id: z.guid(),
  name: z.string(),
  description: optionalText,
  sectionCount: z.number().int().nullish(),
});

const templateSchema = z.object({
  id: z.guid(),
  name: z.string(),
  description: optionalText,
  sections: z.array(
    z.object({
      key: z.string(),
      title: z.string(),
      position: z.number().int().nullish(),
      requiresUserInput: z.boolean().nullish(),
    }),
  ),
});

export type ProposalSummary = z.infer<typeof summarySchema>;
export type ProposalPage = z.infer<typeof pageSchema>;
export type Proposal = z.infer<typeof proposalSchema>;
export type TemplateSummary = z.infer<typeof templateSummarySchema>;
export type Template = z.infer<typeof templateSchema>;

export interface ProposalListParams {
  status?: Proposal["status"];
  q?: string;
  page: number;
  size: number;
  sort: "updatedAt" | "deadline";
  direction: "asc" | "desc";
}

export type ProposalFields = {
  name: string;
  customerName: string;
  customerIndustry: string;
  opportunityDescription: string;
  deadline: string;
  language: string;
  currency: string;
  templateId: string;
  customerWebsite?: string;
  accountManager?: string;
  solutionArchitect?: string;
  salesOwner?: string;
  opportunityValue?: number;
  internalNotes?: string;
};

const header = (workspaceId: string) => workspaceHeader(workspaceId);

export async function listProposals(workspaceId: string, params: ProposalListParams, signal?: AbortSignal) {
  const data = await unwrap(
    api().GET("/api/proposals", {
      params: { header: header(workspaceId), query: { ...params, q: params.q || undefined } },
      signal,
    }),
  );
  return pageSchema.parse(data);
}

export async function getProposal(workspaceId: string, proposalId: string, signal?: AbortSignal) {
  const data = await unwrap(
    api().GET("/api/proposals/{proposalId}", {
      params: { header: header(workspaceId), path: { proposalId } },
      signal,
    }),
  );
  return proposalSchema.parse(data);
}

export async function createProposal(workspaceId: string, body: ProposalFields) {
  const data = await unwrap(api().POST("/api/proposals", { params: { header: header(workspaceId) }, body }));
  return proposalSchema.parse(data);
}

/**
 * PATCH semantics (spec §4): absent = unchanged, "" on an optional field = cleared; `version`
 * guards against concurrent edits (409).
 */
export async function updateProposal(
  workspaceId: string,
  proposalId: string,
  body: Partial<ProposalFields> & { version: number },
) {
  const data = await unwrap(
    api().PATCH("/api/proposals/{proposalId}", {
      params: { header: header(workspaceId), path: { proposalId } },
      body,
    }),
  );
  return proposalSchema.parse(data);
}

/** Creator or OWNER, DRAFT only (409 otherwise, 403 for others). */
export async function deleteProposal(workspaceId: string, proposalId: string) {
  await unwrap(
    api().DELETE("/api/proposals/{proposalId}", { params: { header: header(workspaceId), path: { proposalId } } }),
  );
}

/** FAILED → back to the status before the failure. */
export async function retryProposal(workspaceId: string, proposalId: string) {
  const data = await unwrap(
    api().POST("/api/proposals/{proposalId}/retry", {
      params: { header: header(workspaceId), path: { proposalId } },
    }),
  );
  return proposalSchema.parse(data);
}

export async function listTemplates(workspaceId: string, signal?: AbortSignal) {
  const data = await unwrap(api().GET("/api/templates", { params: { header: header(workspaceId) }, signal }));
  return z.array(templateSummarySchema).parse(data);
}

export async function getTemplate(workspaceId: string, templateId: string, signal?: AbortSignal) {
  const data = await unwrap(
    api().GET("/api/templates/{templateId}", { params: { header: header(workspaceId), path: { templateId } }, signal }),
  );
  const template = templateSchema.parse(data);
  return {
    ...template,
    sections: [...template.sections].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
  };
}

/** OWNER. Name 1–200; 1–50 sections with unique keys `^[a-z0-9][a-z0-9_-]{0,99}$`. */
export async function createTemplate(
  workspaceId: string,
  body: { name: string; description?: string; sections: { key: string; title: string; requiresUserInput?: boolean }[] },
) {
  const data = await unwrap(api().POST("/api/templates", { params: { header: header(workspaceId) }, body }));
  return templateSchema.parse(data);
}
