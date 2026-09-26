// Minimal stand-in for the Spring Boot API used by the Playwright suite (BFF → API calls
// happen on the Next.js server, so the browser cannot intercept them).
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_API_PORT ?? 3199);
export const E2E_USER = { email: "jackie@example.com", password: "correct horse battery" };

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

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  const authed = /^Bearer access-\d+$/.test(req.headers.authorization ?? "");

  if (req.method === "POST" && pathname === "/api/auth/login") {
    const body = await readJson(req);
    return body.email === E2E_USER.email && body.password === E2E_USER.password
      ? json(res, 200, tokens())
      : problem(res, 401, "Unauthorized");
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
  if (pathname.startsWith("/api/")) {
    return authed ? json(res, 200, {}) : problem(res, 401, "Unauthorized");
  }
  problem(res, 404, "Not Found");
}).listen(PORT, () => console.log(`mock API listening on ${PORT}`));
