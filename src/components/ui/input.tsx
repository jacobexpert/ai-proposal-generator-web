import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Design-system text field (App UI: control-h-app 40px, radius-lg, brand focus ring, danger when invalid). */
function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(
        "h-control-app w-full min-w-0 rounded-lg border border-input bg-card px-3 text-body-sm text-foreground transition-[border-color,box-shadow] duration-200 ease-out outline-none placeholder:text-muted-foreground/80 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
