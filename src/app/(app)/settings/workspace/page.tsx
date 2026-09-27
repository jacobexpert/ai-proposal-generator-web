import type { Metadata } from "next";

import { WorkspaceGeneral } from "@/features/workspaces";

export const metadata: Metadata = { title: "General · Settings" };

export default function WorkspaceSettingsPage() {
  return <WorkspaceGeneral />;
}
