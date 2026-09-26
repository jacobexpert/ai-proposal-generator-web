"use client";

import { Building2, ChevronsUpDown, LogOut, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogout } from "@/features/auth/use-logout";

/**
 * Top bar with the workspace switcher and user menu.
 * Sign-out works (US-FE-02); profile and workspace data arrive with US-FE-03.
 */
export function AppTopbar() {
  return (
    <header className="sticky top-0 z-30 flex h-topbar shrink-0 items-center justify-between gap-4 border-b border-border bg-background/90 px-6 backdrop-blur">
      <WorkspaceSwitcher />
      <UserMenu />
    </header>
  );
}

function WorkspaceSwitcher() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" aria-label="Switch workspace" />}>
        <Building2 className="text-muted-foreground" />
        <span className="max-w-56 truncate">Workspace</span>
        <ChevronsUpDown className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          <DropdownMenuItem disabled>Sign in to load your workspaces</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu() {
  const signOut = useLogout();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label="Open user menu" className="rounded-full" />}
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-muted text-foreground">
          <UserRound className="size-4" />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Account</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled>
            <UserRound />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem disabled={signOut.isPending} onClick={() => signOut.mutate()}>
            <LogOut />
            {signOut.isPending ? "Signing out…" : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
