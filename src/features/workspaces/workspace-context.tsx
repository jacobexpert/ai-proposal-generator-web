"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { notifyWarning } from "@/components/feedback/notify";
import { ApiError } from "@/lib/api/client";

import type { CurrentUser, WorkspaceItem } from "./api";
import { meKey, WORKSPACE_SCOPE, workspaceOfKey } from "./query-keys";
import { resolveWorkspace } from "./resolve-workspace";
import { useCurrentUser } from "./use-current-user";
import { rememberWorkspace } from "./workspace-cookie";

interface WorkspaceContextValue {
  user: CurrentUser | undefined;
  /** The workspace every data request of this tab is sent for; undefined while loading or with no membership. */
  workspace: WorkspaceItem | undefined;
  workspaces: readonly WorkspaceItem[];
  switchWorkspace: (id: string) => void;
  query: ReturnType<typeof useCurrentUser>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

/**
 * Holds the current workspace of this browser tab (US-FE-03).
 *
 * The selection lives in React state, not only in the cookie: the cookie is shared by all tabs,
 * so reading it per request would let a switch in one tab silently send another tab's writes to
 * a different workspace. The cookie only restores the last choice on the next page load.
 */
export function WorkspaceProvider({
  initialWorkspaceId,
  children,
}: {
  initialWorkspaceId?: string;
  children: ReactNode;
}) {
  const query = useCurrentUser();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(initialWorkspaceId);

  const workspaces = useMemo(() => query.data?.workspaces ?? [], [query.data]);
  const workspace = query.data ? resolveWorkspace(workspaces, selectedId) : undefined;
  // Adopt the fallback as the selection (render-time state sync), so the tab does not jump back
  // to the lost workspace later if the user is re-invited to it.
  if (query.data && workspace?.id !== selectedId) setSelectedId(workspace?.id);

  /** The workspace this tab last settled on, and a switch the user asked for (not a fallback). */
  const settled = useRef<{ id: string; name: string } | undefined>(undefined);
  const requestedSwitch = useRef<string | undefined>(undefined);

  const dropWorkspaceData = useCallback(() => {
    void queryClient.cancelQueries({ queryKey: [WORKSPACE_SCOPE] });
    queryClient.removeQueries({ queryKey: [WORKSPACE_SCOPE] });
  }, [queryClient]);

  const switchWorkspace = useCallback(
    (id: string) => {
      const target = workspaces.find((w) => w.id === id);
      if (!target || target.id === workspace?.id) return;
      requestedSwitch.current = target.id;
      setSelectedId(target.id);
      dropWorkspaceData();
      router.push("/");
    },
    [workspaces, workspace?.id, dropWorkspaceData, router],
  );

  // Remember the workspace; when it changed without the user asking (AC4: access removed, or the
  // remembered one is gone), say so, drop its data and go to the dashboard.
  const workspaceId = workspace?.id;
  const workspaceName = workspace?.name;
  useEffect(() => {
    if (!workspaceId || !workspaceName) return;
    rememberWorkspace(workspaceId);
    const previous = settled.current;
    settled.current = { id: workspaceId, name: workspaceName };

    if (requestedSwitch.current === workspaceId) {
      requestedSwitch.current = undefined;
      return;
    }
    const lost = previous ? previous.id !== workspaceId : !!initialWorkspaceId && initialWorkspaceId !== workspaceId;
    if (!lost) return;

    dropWorkspaceData();
    notifyWarning(
      previous ? `You no longer have access to “${previous.name}”` : "Your last workspace is no longer available",
      `Switched to “${workspaceName}”.`,
    );
    router.push("/");
  }, [workspaceId, workspaceName, initialWorkspaceId, dropWorkspaceData, router]);

  // AC4: a 404/403 on a request of the current workspace may mean the user was removed from it.
  useEffect(() => {
    if (!workspace) return;
    const recheck = (key: readonly unknown[] | undefined, error: unknown) => {
      if (workspaceOfKey(key) !== workspace.id) return;
      if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
        void queryClient.invalidateQueries({ queryKey: meKey });
      }
    };
    const unsubscribeQueries = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error") recheck(event.query.queryKey, event.action.error);
    });
    const unsubscribeMutations = queryClient.getMutationCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error")
        recheck(event.mutation.options.mutationKey, event.action.error);
    });
    return () => {
      unsubscribeQueries();
      unsubscribeMutations();
    };
  }, [queryClient, workspace]);

  const value = useMemo(
    () => ({ user: query.data, workspace, workspaces, switchWorkspace, query }),
    [query, workspace, workspaces, switchWorkspace],
  );
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspaceContext(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspaceContext must be used inside <WorkspaceProvider>");
  return value;
}

/**
 * The current workspace for data screens. Only call it below `<WorkspaceGate>`, which renders
 * its children once a workspace is resolved.
 */
export function useCurrentWorkspace(): WorkspaceItem {
  const { workspace } = useWorkspaceContext();
  if (!workspace) throw new Error("useCurrentWorkspace must be used inside <WorkspaceGate>");
  return workspace;
}
