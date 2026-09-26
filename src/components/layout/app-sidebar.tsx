"use client";

import { Activity, ChevronsLeft, ChevronsRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isNavItemActive, visibleNavItems, type NavItem } from "@/config/navigation";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  showDevTools?: boolean;
}

const DEV_ITEMS: NavItem[] = [{ href: "/dev/health", label: "System health", icon: Activity, enabled: true }];

export function AppSidebar({ collapsed, onToggle, showDevTools = false }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "sticky top-0 flex h-dvh shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 ease-out",
        collapsed ? "w-sidebar-collapsed" : "w-sidebar",
      )}
    >
      <div className={cn("flex h-topbar items-center gap-2.5 px-4", collapsed && "justify-center px-0")}>
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-linear-135 from-brand to-brand-secondary font-display text-base text-primary-foreground shadow-accent"
        >
          P
        </span>
        {!collapsed && (
          <span className="truncate text-panel-title font-semibold tracking-tight">Proposal Generator</span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-2">
        <nav aria-label="Main" className="flex flex-col gap-1">
          {visibleNavItems().map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={isNavItemActive(pathname, item.href)}
              collapsed={collapsed}
            />
          ))}
        </nav>

        {showDevTools && (
          <nav aria-label="Developer" className="flex flex-col gap-1">
            {!collapsed && (
              <span className="px-3 pb-1 font-mono text-[0.6875rem] tracking-[0.15em] text-muted-foreground uppercase">
                Developer
              </span>
            )}
            {DEV_ITEMS.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                active={isNavItemActive(pathname, item.href)}
                collapsed={collapsed}
              />
            ))}
          </nav>
        )}
      </div>

      <div className={cn("border-t border-border p-3", collapsed && "flex justify-center")}>
        <Button
          variant="ghost"
          size={collapsed ? "icon-sm" : "sm"}
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className={cn(!collapsed && "w-full justify-start")}
        >
          {collapsed ? <ChevronsRight /> : <ChevronsLeft />}
          {!collapsed && "Collapse"}
        </Button>
      </div>
    </aside>
  );
}

function SidebarLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      className={cn(
        "flex h-control-app items-center gap-3 rounded-lg px-3 text-body-sm font-medium transition-colors duration-200 ease-out",
        active ? "bg-accent text-brand-text" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon aria-hidden="true" className="size-[18px] shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}
