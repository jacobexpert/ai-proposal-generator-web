// Minimal stand-in for the Spring Boot API used by the Playwright suite (BFF → API calls
// happen on the Next.js server, so the browser cannot intercept them).
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_API_PORT ?? 3199);
export const E2E_USER = { email: "jackie@example.com", password: "correct horse battery" };

export const E2E_WORKSPACES = [
  { id: "0f5e7b1c-3a2d-4c8e-9b6f-1a2b3c4d5e6f", name: "Acme Consulting", role: "OWNER" },
  { id: "7c9d2e4f-5b6a-4d3c-8e1f-2a3b4c5d6e7f", name: "Globex Delivery", role: "MEMBER" },
];
const ME = {
  id: "11111111-2222-4333-8444-555555555555",
  email: E2E_USER.email,
  displayName: "Jackie Tran",
  status: "ACTIVE",
  workspaces: E2E_WORKSPACES,
};

/** Invitation tokens known to the mock: one for the E2E user, one for someone else. */
const INVITATIONS = {
  "invite-for-jackie": { email: E2E_USER.email },
  "invite-for-colleague": { email: "colleague@example.com" },
};

/** In-memory members / invitations of the first (OWNER) workspace, for US-FE-44. */
const MEMBERS = [
  {
    userId: "11111111-2222-4333-8444-555555555555",
    email: E2E_USER.email,
    displayName: "Jackie Tran",
    role: "OWNER",
    joinedAt: "2026-09-01T08:00:00Z",
  },
  {
    userId: "22222222-3333-4444-8555-666666666666",
    email: "alex@example.com",
    displayName: "Alex Pham",
    role: "MEMBER",
    joinedAt: "2026-09-10T08:00:00Z",
  },
];
const PENDING = [];
let invitationSeq = 0;

/** Proposals & templates (US-FE-05/06/07), shared by all tests: each test uses its own names. */
const TEMPLATES = [
  {
    id: "aaaaaaaa-1111-4222-8333-444444444444",
    name: "Standard IT proposal",
    description: null,
    sections: [
      { key: "executive-summary", title: "Executive Summary", position: 0, requiresUserInput: false },
      { key: "commercial-overview", title: "Commercial Overview", position: 1, requiresUserInput: true },
    ],
  },
];
/** The proposal used by the document upload tests (US-FE-08). */
const DOCUMENTS_PROPOSAL = {
  id: "3f6c2a1b-8d4e-4f5a-9b6c-7d8e9f0a1b2c",
  name: "E2E upload proposal",
  customerName: "Upload Corp",
  customerIndustry: "Retail",
  customerWebsite: null,
  opportunityDescription: "Proposal used by the document upload tests.",
  opportunityValue: null,
  deadline: "2099-12-31",
  language: "en",
  currency: "USD",
  accountManager: null,
  solutionArchitect: null,
  salesOwner: null,
  internalNotes: null,
  templateId: "aaaaaaaa-1111-4222-8333-444444444444",
  status: "DRAFT",
  previousStatus: null,
  createdBy: "11111111-2222-4333-8444-555555555555",
  createdAt: "2026-09-27T08:00:00Z",
  updatedAt: "2026-09-27T08:00:00Z",
  version: 0,
};
const PROPOSALS = [DOCUMENTS_PROPOSAL];
let proposalSeq = 0;
const now = () => new Date().toISOString();

let generation = 0;
const tokens = () => {
  generation += 1;
  return {
    accessToken: `access-${generation}`,
    tokenType: "Bearer",
    expiresIn: 900,
    refreshToken: `refresh-${generation}`,
    refreshExpiresIn: 1209600,
  };
};

const json = (res, status, body, headers = {}) => {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(body === undefined ? "" : JSON.stringify(body));
};
const problem = (res, status, title) =>
  json(res, status, { type: "about:blank", title, status }, { "Content-Type": "application/problem+json" });

const readJson = (req) =>
  new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch {
        resolve({});
      }
    });
  });

/** Uploaded documents (US-FE-08): a file named like "eicar*" is treated as malware (422). */
const DOCUMENTS_PATH = /^\/api\/proposals\/([0-9a-f-]{36})\/documents$/;
let documentSeq = 0;
const readText = (req) =>
  new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("latin1")));
  });

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  const authed = /^Bearer access-\d+$/.test(req.headers.authorization ?? "");

  if (req.method === "POST" && pathname === "/api/auth/login") {
    const body = await readJson(req);
    return body.email === E2E_USER.email && body.password === E2E_USER.password
      ? json(res, 200, tokens())
      : problem(res, 401, "Unauthorized");
  }
  if (req.method === "POST" && pathname === "/api/auth/register") {
    const body = await readJson(req);
    if (body.email === E2E_USER.email) return problem(res, 409, "Conflict");
    // The new account's workspace is the second one of the mock user.
    return json(res, 201, { ...tokens(), workspaceId: E2E_WORKSPACES[1].id });
  }
  if (req.method === "POST" && pathname === "/api/auth/refresh") {
    const body = await readJson(req);
    return /^refresh-\d+$/.test(body.refreshToken ?? "") ? json(res, 200, tokens()) : problem(res, 401, "Unauthorized");
  }
  if (req.method === "POST" && pathname === "/api/auth/logout") {
    if (!authed) return problem(res, 401, "Unauthorized");
    res.writeHead(204).end();
    return;
  }
  if (req.method === "GET" && pathname === "/actuator/health") {
    return json(res, 200, { status: "UP", components: { db: { status: "UP" } } });
  }
  if (req.method === "POST" && pathname === "/api/invitations/lookup") {
    const { token } = await readJson(req);
    const invitation = INVITATIONS[token];
    return invitation
      ? json(res, 200, {
          workspaceName: E2E_WORKSPACES[1].name,
          role: "MEMBER",
          expiresAt: "2026-10-03T09:30:00Z",
          ...invitation,
        })
      : problem(res, 404, "Not Found");
  }
  if (req.method === "POST" && pathname === "/api/invitations/accept") {
    if (!authed) return problem(res, 401, "Unauthorized");
    const { token } = await readJson(req);
    if (!INVITATIONS[token]) return problem(res, 404, "Not Found");
    if (INVITATIONS[token].email !== E2E_USER.email) return problem(res, 403, "Forbidden");
    return json(res, 200, { ...E2E_WORKSPACES[1], createdAt: "2026-09-01T00:00:00Z" });
  }

  const documentsMatch = DOCUMENTS_PATH.exec(pathname);
  if (req.method === "POST" && documentsMatch) {
    if (!authed) return problem(res, 401, "Unauthorized");
    const body = await readText(req);
    const fileName = /filename="([^"]*)"/.exec(body)?.[1] ?? "file";
    const category = new URL(req.url, "http://localhost").searchParams.get("category") ?? "OTHER";
    documentSeq += 1;
    const id = `00000000-0000-4000-8000-${String(documentSeq).padStart(12, "0")}`;
    if (/^eicar/i.test(fileName)) {
      return json(
        res,
        422,
        { type: "about:blank", title: "Unprocessable Entity", status: 422, documentId: id },
        {
          "Content-Type": "application/problem+json",
        },
      );
    }
    // Like the API (US-BE-07): the first document moves the proposal DRAFT → DOCUMENTS_UPLOADED.
    const proposal = PROPOSALS.find((p) => p.id === documentsMatch[1]);
    if (proposal?.status === "DRAFT") {
      Object.assign(proposal, { status: "DOCUMENTS_UPLOADED", version: proposal.version + 1, updatedAt: now() });
    }
    return json(res, 201, {
      id,
      proposalId: documentsMatch[1],
      fileName,
      contentType: "application/pdf",
      sizeBytes: body.length,
      category,
      checksumSha256: "0".repeat(64),
      processingStatus: "UPLOADED",
      uploadedBy: ME.id,
      createdAt: "2026-09-27T08:00:00Z",
      updatedAt: "2026-09-27T08:00:00Z",
    });
  }
  const workspace = pathname.match(/^\/api\/workspaces\/([0-9a-f-]{36})$/);
  if (workspace) {
    if (!authed) return problem(res, 401, "Unauthorized");
    const ws = E2E_WORKSPACES.find((w) => w.id === workspace[1]);
    if (!ws) return problem(res, 404, "Not Found");
    if (req.method === "GET") return json(res, 200, { ...ws, createdAt: "2026-09-01T08:00:00Z" });
  }
  if (
    pathname === "/api/templates" ||
    pathname.startsWith("/api/templates/") ||
    pathname.startsWith("/api/proposals")
  ) {
    if (!authed) return problem(res, 401, "Unauthorized");
    if (!E2E_WORKSPACES.some((w) => w.id === req.headers["x-workspace-id"])) return problem(res, 400, "Bad Request");
    const [, , kind, id, action] = pathname.split("/");
    if (kind === "templates" && req.method === "GET" && !id)
      return json(
        res,
        200,
        TEMPLATES.map((t) => ({ id: t.id, name: t.name, description: null, sectionCount: t.sections.length })),
      );
    if (kind === "templates" && req.method === "GET") {
      const t = TEMPLATES.find((x) => x.id === id);
      return t ? json(res, 200, t) : problem(res, 404, "Not Found");
    }
    if (kind === "proposals" && req.method === "GET" && !id) {
      const url = new URL(req.url, "http://localhost");
      const q = (url.searchParams.get("q") ?? "").toLowerCase();
      const status = url.searchParams.get("status");
      const page = Number(url.searchParams.get("page") ?? 0);
      const size = Number(url.searchParams.get("size") ?? 20);
      const items = PROPOSALS.filter(
        (p) => (!q || `${p.name} ${p.customerName}`.toLowerCase().includes(q)) && (!status || p.status === status),
      ).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      return json(res, 200, {
        items: items.slice(page * size, (page + 1) * size),
        page,
        size,
        totalElements: items.length,
        totalPages: Math.max(1, Math.ceil(items.length / size)),
      });
    }
    if (kind === "proposals" && req.method === "POST" && !id) {
      const body = await readJson(req);
      proposalSeq += 1;
      const p = {
        customerWebsite: null,
        accountManager: null,
        solutionArchitect: null,
        salesOwner: null,
        opportunityValue: null,
        internalNotes: null,
        ...body,
        id: `dddddddd-0000-4000-8000-${String(proposalSeq).padStart(12, "0")}`,
        status: "DRAFT",
        previousStatus: null,
        createdBy: "11111111-2222-4333-8444-555555555555",
        createdAt: now(),
        updatedAt: now(),
        version: 0,
      };
      PROPOSALS.push(p);
      return json(res, 201, p);
    }
    const p = PROPOSALS.find((x) => x.id === id);
    if (kind === "proposals" && !p) return problem(res, 404, "Not Found");
    if (kind === "proposals" && req.method === "GET" && !action) return json(res, 200, p);
    if (kind === "proposals" && req.method === "PATCH" && !action) {
      const body = await readJson(req);
      if (body.version !== p.version) return problem(res, 409, "Conflict");
      Object.assign(p, body, { version: p.version + 1, updatedAt: now() });
      return json(res, 200, p);
    }
    if (kind === "proposals" && req.method === "DELETE" && !action) {
      if (p.status !== "DRAFT") return problem(res, 409, "Conflict");
      PROPOSALS.splice(PROPOSALS.indexOf(p), 1);
      res.writeHead(204).end();
      return;
    }
  }
  const members = pathname.match(/^\/api\/workspaces\/([0-9a-f-]{36})\/(members|invitations)(?:\/([0-9a-f-]{36}))?$/);
  if (members) {
    if (!authed) return problem(res, 401, "Unauthorized");
    const [, workspaceId, kind, id] = members;
    const owner = workspaceId === E2E_WORKSPACES[0].id;
    if (kind === "members" && req.method === "GET" && !id) return json(res, 200, owner ? MEMBERS : MEMBERS.slice(0, 1));
    if (!owner) return problem(res, 403, "Forbidden");
    if (kind === "invitations" && req.method === "GET" && !id) return json(res, 200, PENDING);
    if (kind === "invitations" && req.method === "POST" && !id) {
      const { email, role } = await readJson(req);
      if (MEMBERS.some((m) => m.email === email)) return problem(res, 409, "Conflict");
      invitationSeq += 1;
      const invitation = {
        id: `00000000-0000-4000-8000-${String(invitationSeq).padStart(12, "0")}`,
        email,
        role,
        status: "PENDING",
        createdAt: "2026-09-27T08:00:00Z",
        expiresAt: "2026-10-04T08:00:00Z",
      };
      PENDING.splice(0, PENDING.length, ...PENDING.filter((i) => i.email !== email), invitation);
      const token = `mock-token-${invitationSeq}`;
      return json(res, 201, {
        ...invitation,
        invitationToken: token,
        invitationUrl: `http://localhost:3100/invitations/accept?token=${token}`,
      });
    }
    if (kind === "invitations" && req.method === "DELETE" && id) {
      const index = PENDING.findIndex((i) => i.id === id);
      if (index < 0) return problem(res, 404, "Not Found");
      PENDING.splice(index, 1);
      res.writeHead(204).end();
      return;
    }
    const member = MEMBERS.find((m) => m.userId === id);
    if (kind === "members" && id && !member) return problem(res, 404, "Not Found");
    const owners = MEMBERS.filter((m) => m.role === "OWNER").length;
    if (kind === "members" && req.method === "PATCH" && member) {
      const { role } = await readJson(req);
      if (member.role === "OWNER" && role !== "OWNER" && owners === 1) return problem(res, 409, "Conflict");
      member.role = role;
      res.writeHead(204).end();
      return;
    }
    if (kind === "members" && req.method === "DELETE" && member) {
      if (member.role === "OWNER" && owners === 1) return problem(res, 409, "Conflict");
      MEMBERS.splice(MEMBERS.indexOf(member), 1);
      res.writeHead(204).end();
      return;
    }
  }
  if (req.method === "GET" && pathname === "/api/me") {
    return authed ? json(res, 200, ME) : problem(res, 401, "Unauthorized");
  }
  if (req.method === "GET" && pathname === "/api/workspaces/current") {
    if (!authed) return problem(res, 401, "Unauthorized");
    const ws = E2E_WORKSPACES.find((w) => w.id === req.headers["x-workspace-id"]);
    return ws ? json(res, 200, { ...ws, createdAt: "2026-09-01T00:00:00Z" }) : problem(res, 404, "Not Found");
  }
  if (pathname.startsWith("/api/")) {
    return authed ? json(res, 200, {}) : problem(res, 401, "Unauthorized");
  }
  problem(res, 404, "Not Found");
}).listen(PORT, () => console.log(`mock API listening on ${PORT}`));
