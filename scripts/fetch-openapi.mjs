// Downloads the API's OpenAPI document into openapi/openapi.json (committed snapshot).
// Usage: npm run api:spec            (API_BASE_URL defaults to http://localhost:8080)
//        npm run api:types           (regenerates src/lib/api/schema.d.ts from the snapshot)
import { writeFile } from "node:fs/promises";

const base = (process.env.API_BASE_URL ?? "http://localhost:8080").replace(/\/+$/, "");
const url = `${base}/v3/api-docs`;

const response = await fetch(url, { headers: { Accept: "application/json" } });
if (!response.ok) {
  console.error(`Failed to download ${url}: HTTP ${response.status}`);
  process.exit(1);
}
const spec = await response.json();
if (typeof spec?.openapi !== "string" || typeof spec?.paths !== "object") {
  console.error(`${url} did not return an OpenAPI document`);
  process.exit(1);
}
await writeFile(new URL("../openapi/openapi.json", import.meta.url), `${JSON.stringify(spec, null, 2)}\n`);
console.log(`Saved ${Object.keys(spec.paths).length} paths from ${url} to openapi/openapi.json`);
