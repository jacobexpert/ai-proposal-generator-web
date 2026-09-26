import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Design system Button, sized for the app (App UI: control-h-app 40px, control-h-sm 32px).
 * `primary` carries the signature gradient — one per view.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg text-body-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          "bg-linear-to-r from-brand to-brand-secondary text-primary-foreground shadow-sm hover:shadow-accent active:scale-[0.98]",
        secondary: "border border-border bg-card text-foreground hover:border-brand-line hover:bg-muted",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        destructive: "bg-danger text-destructive-foreground shadow-sm hover:bg-danger/90",
        link: "h-auto px-0 text-brand-text underline-offset-4 hover:underline",
      },
      size: {
        default: "h-control-app px-4",
        sm: "h-control-sm rounded-md px-3 text-caption",
        lg: "h-12 rounded-xl px-6 text-base",
        icon: "size-control-app",
        "icon-sm": "size-control-sm rounded-md",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps extends ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
