"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { getBreadcrumbs, type Breadcrumb } from "@/config/navigation";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Defaults to crumbs derived from the current route. */
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
}

/** One per screen: breadcrumb, page title (Calistoga), primary action on the right. */
export function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps) {
  const pathname = usePathname();
  const crumbs = breadcrumbs ?? getBreadcrumbs(pathname);

  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {crumbs.length > 1 && (
          <nav aria-label="Breadcrumb" className="mb-2">
            <ol className="flex flex-wrap items-center gap-1 text-body-sm text-muted-foreground">
              {crumbs.map((crumb, index) => {
                const last = index === crumbs.length - 1;
                return (
                  <li key={crumb.href} className="flex items-center gap-1">
                    {last ? (
                      <span aria-current="page" className="text-foreground">
                        {crumb.label}
                      </span>
                    ) : (
                      <Link href={crumb.href} className="hover:text-foreground hover:underline">
                        {crumb.label}
                      </Link>
                    )}
                    {!last && <ChevronRight aria-hidden="true" className="size-3.5" />}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
        <h1 className="font-display text-page-title text-foreground">{title}</h1>
        {description && <p className="mt-1 text-body-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
