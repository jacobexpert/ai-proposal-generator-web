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
      return json(res, 422, { type: "about:blank", title: "Unprocessable Entity", status: 422, documentId: id }, {
        "Content-Type": "application/problem+json",
      });
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
