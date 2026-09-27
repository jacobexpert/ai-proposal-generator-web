import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Design-system multi-line field; same border, focus and invalid states as Input. */
function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-24 w-full min-w-0 rounded-lg border border-input bg-card px-3 py-2 text-body-sm text-foreground transition-[border-color,box-shadow] duration-200 ease-out outline-none placeholder:text-muted-foreground/80 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
