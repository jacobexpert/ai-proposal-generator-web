import { ClipboardCheck, FileDown, FileText, ListChecks, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Proposal" };

/**
 * Placeholder for proposal tabs whose story has not shipped. A tab's own folder
 * (e.g. `documents/page.tsx` from FE 02, US-FE-08) takes precedence over this dynamic segment,
 * so it disappears tab by tab without touching this file.
 */
const PLACEHOLDERS: Record<string, { icon: LucideIcon; message: string }> = {
  requirements: { icon: ListChecks, message: "Extracted requirements will be reviewed here (US-FE-10 → 13)." },
  proposal: { icon: FileText, message: "The outline and proposal sections will be edited here (US-FE-14 → 21)." },
  review: { icon: ClipboardCheck, message: "Review and approval will happen here (US-FE-22, US-FE-23)." },
  exports: { icon: FileDown, message: "DOCX and PDF exports will be listed here (US-FE-24)." },
};

export default async function ProposalTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  const placeholder = PLACEHOLDERS[tab];
  if (!placeholder) notFound();
  return <ComingSoon icon={placeholder.icon} message={placeholder.message} />;
}
