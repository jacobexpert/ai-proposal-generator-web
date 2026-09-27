"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/settings/workspace", label: "General" },
  { href: "/settings/members", label: "Members" },
] as const;

/** Settings sub-navigation: links styled like the design-system underline tabs. */
export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings" className="mb-6 flex items-center gap-6 border-b border-border">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex h-10 items-center border-b-2 border-transparent text-body-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              active && "border-brand text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
