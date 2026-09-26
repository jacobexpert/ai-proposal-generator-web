import { http, HttpResponse } from "msw";

/** The Spring Boot API as seen by the BFF route handlers (server side). */
export const BACKEND_URL = "http://api.test";
/** The same-origin BFF as seen by the browser (jsdom origin is http://localhost:3000). */
export const BFF_BASE_URL = "http://localhost:3000/api/backend";

/** Default happy-path handlers; tests override per case with `server.use(...)`. */
export const handlers = [
  http.get(`${BFF_BASE_URL}/actuator/health`, () =>
    HttpResponse.json({ status: "UP", components: { db: { status: "UP" }, diskSpace: { status: "UP" } } }),
  ),
];
