import { http, HttpResponse } from "msw";

export const API_BASE_URL = "http://api.test";

/** Default happy-path handlers; tests override per case with `server.use(...)`. */
export const handlers = [
  http.get(`${API_BASE_URL}/actuator/health`, () =>
    HttpResponse.json({ status: "UP", components: { db: { status: "UP" }, diskSpace: { status: "UP" } } }),
  ),
];
