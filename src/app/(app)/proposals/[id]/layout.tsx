import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ProposalShell } from "@/features/proposals/proposal-shell";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ProposalLayout({
  children,
  params,
}: Readonly<{ children: ReactNode; params: Promise<{ id: string }> }>) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  return <ProposalShell proposalId={id.toLowerCase()}>{children}</ProposalShell>;
}
