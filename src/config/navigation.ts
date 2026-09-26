import { FileText, LayoutDashboard, Library, Settings, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Items for later phases stay defined but hidden until their feature ships. */
  enabled: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, enabled: true },
  { href: "/proposals", label: "Proposals", icon: FileText, enabled: true },
  // Company knowledge library ships in Phase 2 (US-FE-26).
  { href: "/knowledge", label: "Knowledge", icon: Library, enabled: false },
  { href: "/settings", label: "Settings", icon: Settings, enabled: true },
];

export const visibleNavItems = (items: readonly NavItem[] = NAV_ITEMS) => items.filter((item) => item.enabled);

/** `/` only matches itself; other items also match their sub-routes. */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const ROUTE_LABELS: Record<string, string> = {
  "/proposals": "Proposals",
  "/proposals/new": "New proposal",
  "/settings": "Settings",
  "/settings/workspace": "Workspace",
  "/settings/members": "Members",
  "/knowledge": "Knowledge",
  "/dev/health": "System health",
};

export interface Breadcrumb {
  label: string;
  href: string;
}

/** Breadcrumbs for known routes; unknown segments (e.g. ids) are skipped — pages may pass their own. */
export function getBreadcrumbs(pathname: string): Breadcrumb[] {
  const crumbs: Breadcrumb[] = [{ label: "Dashboard", href: "/" }];
  const segments = pathname.split("/").filter(Boolean);
  let path = "";
  for (const segment of segments) {
    path += `/${segment}`;
    const label = ROUTE_LABELS[path];
    if (label) crumbs.push({ label, href: path });
  }
  return crumbs;
}
