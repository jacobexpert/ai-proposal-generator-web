import { http, HttpResponse } from "msw";

/** The Spring Boot API as seen by the BFF route handlers (server side). */
export const BACKEND_URL = "http://api.test";
/** The same-origin BFF as seen by the browser (jsdom origin is http://localhost:3000). */
export const BFF_BASE_URL = "http://localhost:3000/api/backend";

export const TEST_WORKSPACES = {
  acme: { id: "0f5e7b1c-3a2d-4c8e-9b6f-1a2b3c4d5e6f", name: "Acme Consulting", role: "OWNER" },
  globex: { id: "7c9d2e4f-5b6a-4d3c-8e1f-2a3b4c5d6e7f", name: "Globex Delivery", role: "MEMBER" },
} as const;

export const TEST_USER = {
  id: "11111111-2222-4333-8444-555555555555",
  email: "jackie@example.com",
  displayName: "Jackie Tran",
  status: "ACTIVE",
  workspaces: [TEST_WORKSPACES.acme, TEST_WORKSPACES.globex],
};

/** Default happy-path handlers; tests override per case with `server.use(...)`. */
export const handlers = [
  http.get(`${BFF_BASE_URL}/api/me`, () => HttpResponse.json(TEST_USER)),
  http.get(`${BFF_BASE_URL}/actuator/health`, () =>
    HttpResponse.json({ status: "UP", components: { db: { status: "UP" }, diskSpace: { status: "UP" } } }),
  ),
];
