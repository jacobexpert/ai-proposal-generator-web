import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** App UI › States: one sentence and at most one action. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center",
        className,
      )}
    >
      {Icon && (
        <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon aria-hidden="true" className="size-5" />
        </span>
      )}
      <div>
        <p className="text-panel-title font-semibold text-foreground">{title}</p>
        {description && <p className="mt-1 max-w-md text-body-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
