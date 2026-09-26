import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Design system StatusBadge: the status word first, colour second (App UI › States). */
const statusBadgeVariants = cva(
  "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-caption font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-foreground",
        info: "bg-info-subtle text-info",
        success: "bg-success-subtle text-success",
        warning: "bg-warning-subtle text-warning",
        danger: "bg-danger-subtle text-danger",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface StatusBadgeProps extends ComponentProps<"span">, VariantProps<typeof statusBadgeVariants> {
  /** Pulse the dot while a job is running. */
  pulse?: boolean;
}

function StatusBadge({ className, tone, pulse = false, children, ...props }: StatusBadgeProps) {
  return (
    <span data-slot="status-badge" className={cn(statusBadgeVariants({ tone }), className)} {...props}>
      <span aria-hidden="true" className={cn("size-1.5 rounded-full bg-current", pulse && "animate-pulse")} />
      {children}
    </span>
  );
}

export { StatusBadge, statusBadgeVariants };
