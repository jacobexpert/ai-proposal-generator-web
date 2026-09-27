import { http, HttpResponse } from "msw";

import { BFF_BASE_URL, TEST_USER } from "@/mocks/handlers";

/** In-memory proposals/templates API for component tests (one workspace is enough here). */
export const TEMPLATE = {
  id: "aaaaaaaa-1111-4222-8333-444444444444",
  name: "Standard IT proposal",
  description: null,
  sections: [
    { key: "executive-summary", title: "Executive Summary", position: 0, requiresUserInput: false },
    { key: "commercial-overview", title: "Commercial Overview", position: 1, requiresUserInput: true },
  ],
};

export function makeProposal(overrides: Record<string, unknown> = {}) {
  return {
    id: "bbbbbbbb-1111-4222-8333-444444444444",
    name: "Core banking modernization",
    customerName: "Contoso Bank",
    customerIndustry: "Banking",
    opportunityDescription: "Move the core platform to Azure.",
    deadline: "2030-01-15",
    language: "en",
    currency: "USD",
    templateId: TEMPLATE.id,
    customerWebsite: null,
    accountManager: "Linh Nguyen",
    solutionArchitect: null,
    salesOwner: null,
    opportunityValue: 250000,
    internalNotes: null,
    status: "DRAFT",
    previousStatus: null,
    createdBy: TEST_USER.id,
    createdAt: "2026-09-20T08:00:00Z",
    updatedAt: "2026-09-27T08:00:00Z",
    version: 1,
    ...overrides,
  };
}

const problem = (status: number, extra: Record<string, unknown> = {}) =>
  HttpResponse.json(
    { status, title: "x", ...extra },
    { status, headers: { "Content-Type": "application/problem+json" } },
  );

export interface ProposalApiState {
  proposals: ReturnType<typeof makeProposal>[];
  templates: (typeof TEMPLATE)[];
  requests: {
    method: string;
    path: string;
    body?: unknown;
    query?: Record<string, string>;
    workspace?: string | null;
  }[];
}

export function proposalApi(state: ProposalApiState) {
  const log = async (request: Request) => {
    const url = new URL(request.url);
    const body =
      request.method === "GET" || request.method === "DELETE"
        ? undefined
        : await request
            .clone()
            .json()
            .catch(() => undefined);
    state.requests.push({
      method: request.method,
      path: url.pathname.replace("/api/backend", ""),
      body,
      query: Object.fromEntries(url.searchParams),
      workspace: request.headers.get("X-Workspace-Id"),
    });
    return body as Record<string, unknown> | undefined;
  };
  const find = (id: string) => state.proposals.find((p) => p.id === id);
  return [
    http.get(`${BFF_BASE_URL}/api/templates`, async ({ request }) => {
      await log(request);
      return HttpResponse.json(
        state.templates.map((t) => ({ id: t.id, name: t.name, description: null, sectionCount: t.sections.length })),
      );
    }),
    http.get(`${BFF_BASE_URL}/api/templates/:id`, async ({ request, params }) => {
      await log(request);
      const t = state.templates.find((x) => x.id === params.id);
      return t ? HttpResponse.json(t) : problem(404);
    }),
    http.post(`${BFF_BASE_URL}/api/templates`, async ({ request }) => {
      const body = (await log(request)) as {
        name: string;
        sections: { key: string; title: string; requiresUserInput?: boolean }[];
      };
      const t = {
        id: "cccccccc-1111-4222-8333-444444444444",
        name: body.name,
        description: null,
        sections: body.sections.map((s, i) => ({ ...s, position: i, requiresUserInput: !!s.requiresUserInput })),
      };
      state.templates.push(t);
      return HttpResponse.json(t, { status: 201 });
    }),
    http.get(`${BFF_BASE_URL}/api/proposals`, async ({ request }) => {
      await log(request);
      const url = new URL(request.url);
      const q = url.searchParams.get("q")?.toLowerCase();
      const status = url.searchParams.get("status");
      const page = Number(url.searchParams.get("page") ?? 0);
      const size = Number(url.searchParams.get("size") ?? 20);
      const items = state.proposals.filter(
        (p) =>
          (!q || p.name.toLowerCase().includes(q) || p.customerName.toLowerCase().includes(q)) &&
          (!status || p.status === status),
      );
      return HttpResponse.json({
        items: items.slice(page * size, page * size + size),
        page,
        size,
        totalElements: items.length,
        totalPages: Math.max(1, Math.ceil(items.length / size)),
      });
    }),
    http.post(`${BFF_BASE_URL}/api/proposals`, async ({ request }) => {
      const body = await log(request);
      const created = makeProposal({ ...body, id: "dddddddd-1111-4222-8333-444444444444", version: 0 });
      state.proposals.push(created);
      return HttpResponse.json(created, { status: 201 });
    }),
    http.get(`${BFF_BASE_URL}/api/proposals/:id`, async ({ request, params }) => {
      await log(request);
      const p = find(params.id as string);
      return p ? HttpResponse.json(p) : problem(404);
    }),
    http.patch(`${BFF_BASE_URL}/api/proposals/:id`, async ({ request, params }) => {
      const body = (await log(request)) as Record<string, unknown>;
      const p = find(params.id as string);
      if (!p) return problem(404);
      if (body.version !== p.version) return problem(409);
      Object.assign(p, body, { version: p.version + 1 });
      return HttpResponse.json(p);
    }),
    http.delete(`${BFF_BASE_URL}/api/proposals/:id`, async ({ request, params }) => {
      await log(request);
      const p = find(params.id as string);
      if (!p) return problem(404);
      if (p.status !== "DRAFT") return problem(409);
      state.proposals.splice(state.proposals.indexOf(p), 1);
      return new HttpResponse(null, { status: 204 });
    }),
    http.post(`${BFF_BASE_URL}/api/proposals/:id/retry`, async ({ request, params }) => {
      await log(request);
      const p = find(params.id as string);
      if (!p) return problem(404);
      if (p.status !== "FAILED") return problem(409);
      Object.assign(p, { status: p.previousStatus ?? "DRAFT", previousStatus: "FAILED", version: p.version + 1 });
      return HttpResponse.json(p);
    }),
  ];
}
