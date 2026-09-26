import type { LucideIcon } from "lucide-react";

/** Temporary body for screens whose story has not been built yet. */
export function ComingSoon({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
      <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <p className="max-w-md text-body-sm text-muted-foreground">{message}</p>
    </div>
  );
}
