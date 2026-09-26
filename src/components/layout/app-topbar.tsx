"use client";

import { LogOut, UserRound } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogout } from "@/features/auth/use-logout";
import { ROLE_LABEL, useWorkspaceContext, WorkspaceSwitcher } from "@/features/workspaces";

/** Top bar: workspace switcher and user menu (US-FE-03). */
export function AppTopbar() {
  return (
    <header className="sticky top-0 z-30 flex h-topbar shrink-0 items-center justify-between gap-4 border-b border-border bg-background/90 px-6 backdrop-blur">
      <WorkspaceSwitcher />
      <UserMenu />
    </header>
  );
}

/** Up to two initials from the display name, for the avatar. */
export function initials(name: string | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return letters.map((p) => p[0]!.toUpperCase()).join("");
}

function UserMenu() {
  const signOut = useLogout();
  const { user, workspace } = useWorkspaceContext();
  const avatar = initials(user?.displayName);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label="Open user menu" className="rounded-full" />}
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-muted text-caption font-semibold text-foreground">
          {avatar || <UserRound className="size-4" />}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
            {user ? (
              <>
                <span className="truncate text-body-sm font-medium text-foreground">{user.displayName}</span>
                <span className="truncate text-caption text-muted-foreground">{user.email}</span>
              </>
            ) : (
              "Account"
            )}
          </DropdownMenuLabel>
          {workspace && (
            <p className="px-2 pb-2 text-caption text-muted-foreground">
              <span className="text-foreground">{workspace.name}</span> · {ROLE_LABEL[workspace.role]}
            </p>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLinkItem closeOnClick render={<Link href="/profile" />}>
            <UserRound />
            Profile
          </DropdownMenuLinkItem>
          <DropdownMenuItem disabled={signOut.isPending} onClick={() => signOut.mutate()}>
            <LogOut />
            {signOut.isPending ? "Signing out…" : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
