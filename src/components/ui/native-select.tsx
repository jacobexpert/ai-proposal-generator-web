import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * shadcn/ui NativeSelect: a real <select> (keyboard, screen readers, mobile pickers and form
 * libraries work out of the box), styled like Input.
 */
function NativeSelect({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div data-slot="native-select-wrapper" className="relative w-full">
      <select
        data-slot="native-select"
        className={cn(
          "h-control-app w-full min-w-0 appearance-none rounded-lg border border-input bg-card pr-9 pl-3 text-body-sm text-foreground transition-[border-color,box-shadow] duration-200 ease-out outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export { NativeSelect };
