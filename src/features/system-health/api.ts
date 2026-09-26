import { z } from "zod";

import { apiFetch } from "@/lib/api/client";

const statusSchema = z.string().min(1).max(40);

export const healthSchema = z.object({
  status: statusSchema,
  components: z.record(z.string().max(100), z.object({ status: statusSchema }).loose()).optional(),
});

export type Health = z.infer<typeof healthSchema>;

/** `GET /actuator/health` — public endpoint; the response is validated, never trusted blindly. */
export async function fetchHealth(signal?: AbortSignal): Promise<Health> {
  const body = await apiFetch<unknown>("/actuator/health", { signal, cache: "no-store" });
  return healthSchema.parse(body);
}
