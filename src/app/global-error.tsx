"use client";

import "./globals.css";

/**
 * Last-resort boundary when the root layout itself fails (US-FE-04 AC4). It replaces the whole
 * document, so it renders its own <html>/<body> and uses only design tokens from globals.css.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body>
        <title>Something went wrong · AI Proposal Generator</title>
        <main className="flex min-h-dvh items-center justify-center bg-background px-4">
          <div role="alert" className="flex max-w-md flex-col items-center gap-3 text-center">
            <h1 className="font-display text-page-title text-foreground">Something went wrong</h1>
            <p className="text-body-sm text-muted-foreground">The application hit an unexpected error. Try again.</p>
            {error.digest && <p className="font-mono text-mono-sm text-muted-foreground">Reference: {error.digest}</p>}
            <button
              type="button"
              onClick={() => retry()}
              className="mt-2 h-control-app cursor-pointer rounded-lg bg-linear-to-r from-brand to-brand-secondary px-4 text-body-sm font-medium text-brand-foreground"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
