"use client";

import { Building2 } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";

import { useWorkspaceContext } from "./workspace-context";

/** Renders the page only once the current workspace is known (US-FE-03 AC4). */
export function WorkspaceGate({ children }: { children: ReactNode }) {
  const { query, workspace } = useWorkspaceContext();

  if (query.isPending) return <LoadingState label="Loading your workspace" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (!workspace) {
    return (
      <EmptyState
        icon={Building2}
        title="You're not a member of any workspace yet"
        description="Ask a workspace owner to send you an invitation link, then open it to join."
      />
    );
  }
  return children;
}
