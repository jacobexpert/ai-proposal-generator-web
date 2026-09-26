"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * shadcn/ui Toaster (sonner), styled per the design system App UI › States:
 * bottom-right, `card` surface with `shadow-lg`; status colour + icon + words.
 */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-right"
      closeButton
      richColors={false}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-xl !border !border-border !bg-card !text-foreground !shadow-lg !font-sans !text-body-sm !gap-2.5",
          title: "!font-medium",
          description: "!text-muted-foreground",
          error: "[&_[data-icon]]:!text-danger",
          success: "[&_[data-icon]]:!text-success",
          warning: "[&_[data-icon]]:!text-warning",
          info: "[&_[data-icon]]:!text-info",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
