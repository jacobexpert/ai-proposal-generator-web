"use client";

import { Building2, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

import { ROLE_LABEL } from "./role-label";
import { useWorkspaceContext } from "./workspace-context";

/** US-FE-03 AC2: lists the user's workspaces (name + role); picking one switches the whole app. */
export function WorkspaceSwitcher() {
  const { workspace, workspaces, switchWorkspace, query } = useWorkspaceContext();

  if (query.isPending) return <Skeleton role="status" aria-label="Loading workspaces" className="h-control-sm w-48" />;
  if (!workspace) return <span />;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" aria-label={`Switch workspace (current: ${workspace.name})`} />}
      >
        <Building2 className="text-muted-foreground" />
        <span className="max-w-56 truncate">{workspace.name}</span>
        <ChevronsUpDown className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={workspace.id} onValueChange={(id: string) => switchWorkspace(id)}>
            {workspaces.map((w) => (
              <DropdownMenuRadioItem key={w.id} value={w.id}>
                <span className="min-w-0 flex-1 truncate">{w.name}</span>
                <span className="text-caption text-muted-foreground">{ROLE_LABEL[w.role]}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
