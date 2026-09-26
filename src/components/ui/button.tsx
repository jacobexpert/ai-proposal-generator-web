import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * shadcn/ui Button (Base UI), styled per the design system App UI:
 * - `default` = the signature gradient primary — one per view.
 * - `outline` = the design system's "secondary" (hairline outline) button.
 * - Sizes: `default` control-h-app 40px, `sm` control-h-sm 32px, `lg` control-h 48px.
 * - Sentence-case labels, never uppercase.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-transparent bg-clip-padding text-body-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out outline-none select-none active:not-aria-[haspopup]:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-danger [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-linear-to-r from-brand to-brand-secondary text-brand-foreground shadow-sm hover:shadow-accent",
        outline:
          "border-border bg-card text-foreground hover:border-brand-line hover:bg-muted aria-expanded:border-brand-line aria-expanded:bg-muted",
        secondary: "bg-muted text-foreground hover:bg-border/60 aria-expanded:bg-border/60",
        ghost:
          "text-muted-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive: "bg-danger text-danger-foreground shadow-sm hover:bg-danger/90",
        link: "h-auto px-0 text-brand-text underline-offset-4 hover:underline",
      },
      size: {
        default: "h-control-app px-4",
        xs: "h-7 gap-1 rounded-md px-2.5 text-caption [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-control-sm gap-1.5 rounded-md px-3 text-caption",
        lg: "h-control rounded-xl px-6 text-base",
        icon: "size-control-app",
        "icon-xs": "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-control-sm rounded-md",
        "icon-lg": "size-control rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
