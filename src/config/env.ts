import { z } from "zod";

/**
 * Public (browser-exposed) environment. Only `NEXT_PUBLIC_*` values belong here —
 * never put secrets in this schema: everything in it is shipped to the client.
 */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z
    .url({ protocol: /^https?$/, error: "must be an http(s) URL" })
    .transform((url) => url.replace(/\/+$/, "")),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  const result = publicEnvSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid public environment configuration:\n${issues}`);
  }
  return result.data;
}

/*
 * NEXT_PUBLIC_* values are inlined at build time only when referenced literally,
 * so each variable is listed explicitly here.
 */
export const env: PublicEnv = parsePublicEnv({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
});
