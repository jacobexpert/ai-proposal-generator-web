import type { ReactNode } from "react";

/** Minimal centred layout for pages outside the app shell (sign-in, later sign-up / invitation). */
export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-lg bg-linear-135 from-brand to-brand-secondary font-display text-lg text-brand-foreground shadow-accent"
          >
            P
          </span>
          <span className="text-panel-title font-semibold tracking-tight">Proposal Generator</span>
        </div>
        {children}
      </div>
    </main>
  );
}
