import { LayoutDashboard } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/layout/coming-soon";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" description="Your proposals, their status and what needs attention next." />
      <ComingSoon icon={LayoutDashboard} message="The proposal overview will appear here." />
    </>
  );
}
