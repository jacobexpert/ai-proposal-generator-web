import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Not found" };

/** Global 404 (US-FE-04 AC4). Same wording as a 403/404 from the API: never reveal whether something exists. */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <SearchX aria-hidden="true" className="size-6" />
        </span>
        <h1 className="font-display text-page-title text-foreground">Not found or you don&apos;t have access</h1>
        <p className="text-body-sm text-muted-foreground">
          The page may have moved, been removed, or belong to a workspace you&apos;re not a member of.
        </p>
        {/* A real link (a Base UI Button rendered as <a> would still announce role="button"). */}
        <Link href="/" className={buttonVariants()}>
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
