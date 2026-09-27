import { z } from "zod";

/**
 * Server-side environment (read by the BFF route handlers and `proxy.ts`).
 * Nothing here is sent to the browser: the browser only talks to this app's own
 * `/api/*` routes (FDEC-03), so there is no public API URL any more.
 * Never import this module from a Client Component.
 */
export const serverEnvSchema = z.object({
  API_BASE_URL: z
    .url({ protocol: /^https?$/, error: "must be an http(s) URL" })
    .transform((url) => url.replace(/\/+$/, "")),
  /** Request timeout (ms) for BFF → backend calls. */
  API_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).default(30_000),
  /**
   * Timeout (ms) for streamed uploads (US-FE-08): sending up to 25 MB, then malware scan and type
   * detection on the API, takes longer than an ordinary call.
   */
  API_UPLOAD_TIMEOUT_MS: z.coerce.number().int().min(1000).max(1_800_000).default(300_000),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid server environment configuration:\n${issues}`);
  }
  return result.data;
}

let cached: ServerEnv | undefined;

/** Lazily parsed so tests can set variables first; `next.config.ts` calls it to fail fast at startup. */
export function serverEnv(): ServerEnv {
  cached ??= parseServerEnv({
    API_BASE_URL: process.env.API_BASE_URL,
    API_TIMEOUT_MS: process.env.API_TIMEOUT_MS,
    API_UPLOAD_TIMEOUT_MS: process.env.API_UPLOAD_TIMEOUT_MS,
  });
  return cached;
}
