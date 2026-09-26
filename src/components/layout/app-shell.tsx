"use client";

import type { ReactNode } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { WorkspaceGate, WorkspaceProvider } from "@/features/workspaces";

import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import { useSidebarCollapsed } from "./use-sidebar-collapsed";

interface AppShellProps {
  children: ReactNode;
  showDevTools?: boolean;
  /** Last workspace from the `apg_ws` cookie (read on the server); validated against `/api/me`. */
  initialWorkspaceId?: string;
}

export function AppShell({ children, showDevTools = false, initialWorkspaceId }: AppShellProps) {
  const [collapsed, toggle] = useSidebarCollapsed();

  return (
    <WorkspaceProvider initialWorkspaceId={initialWorkspaceId}>
      <TooltipProvider>
        <a
          href="#main-content"
          className="sr-only z-50 rounded-lg bg-card px-4 py-2 text-body-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <div className="flex min-h-dvh">
          <AppSidebar collapsed={collapsed} onToggle={toggle} showDevTools={showDevTools} />
          <div className="flex min-w-0 flex-1 flex-col">
            <AppTopbar />
            <main id="main-content" tabIndex={-1} className="flex-1 p-6 focus:outline-none">
              <WorkspaceGate>{children}</WorkspaceGate>
            </main>
          </div>
        </div>
      </TooltipProvider>
    </WorkspaceProvider>
  );
}
