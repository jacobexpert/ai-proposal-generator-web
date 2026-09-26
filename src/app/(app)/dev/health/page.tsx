import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { SystemHealthPanel } from "@/features/system-health/system-health-panel";

export const metadata: Metadata = { title: "System health" };

/** Developer-only page (US-FE-01 AC5): hidden in production builds. */
export default function SystemHealthPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <>
      <PageHeader title="System health" description="Backend status from GET /actuator/health." />
      <SystemHealthPanel />
    </>
  );
}
