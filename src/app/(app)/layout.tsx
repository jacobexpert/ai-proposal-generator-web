import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { parseWorkspaceId, WORKSPACE_COOKIE } from "@/features/workspaces/workspace-cookie";

export default async function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  const initialWorkspaceId = parseWorkspaceId((await cookies()).get(WORKSPACE_COOKIE)?.value);
  return (
    <AppShell showDevTools={process.env.NODE_ENV !== "production"} initialWorkspaceId={initialWorkspaceId}>
      {children}
    </AppShell>
  );
}
