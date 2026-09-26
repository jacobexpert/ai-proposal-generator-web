import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Inline alert (App UI › States): status colour + icon + words, never colour alone. */
const alertVariants = cva(
  "flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-body-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      tone: {
        info: "bg-info-subtle text-info",
        success: "bg-success-subtle text-success",
        warning: "bg-warning-subtle text-warning",
        danger: "bg-danger-subtle text-danger",
      },
    },
    defaultVariants: { tone: "info" },
  },
);

function Alert({ className, tone, ...props }: ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" role="alert" className={cn(alertVariants({ tone }), className)} {...props} />;
}

export { Alert };
