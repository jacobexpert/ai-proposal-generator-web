"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { notifyError } from "@/components/feedback/notify";
import { Toaster } from "@/components/ui/sonner";
import { ApiError } from "@/lib/api/client";
import { loginUrl } from "@/lib/return-url";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      /** Set to false when the screen shows the error itself (e.g. inline in a dialog). */
      errorToast?: boolean;
    };
  }
}

/**
 * US-FE-02 AC5: the BFF already refreshed the token when it could, so a 401 reaching the
 * browser means the session is over. A full navigation (not a client transition) is used so
 * `beforeunload` guards of screens with unsaved changes still warn the user first.
 */
export function redirectToLoginOnUnauthorized(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 401 || typeof window === "undefined") return false;
  const { pathname, search } = window.location;
  if (pathname !== "/login") window.location.assign(loginUrl(`${pathname}${search}`));
  return true;
}

/** 400 is shown on the form fields, 401 redirects; everything else from a mutation gets a toast. */
function isToastWorthy(error: unknown): boolean {
  return !(error instanceof ApiError && (error.status === 400 || error.status === 401));
}

export function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (redirectToLoginOnUnauthorized(error)) return;
        // First loads render an <ErrorState/>; a failed background refresh keeps the old data, so tell the user.
        if (query.state.data !== undefined && isToastWorthy(error)) notifyError(error);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (redirectToLoginOnUnauthorized(error)) return;
        if (mutation.meta?.errorToast !== false && isToastWorthy(error)) notifyError(error);
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Never retry auth/permission/not-found errors; retry other failures once.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 1,
      },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  // One client per browser session (never shared between requests on the server).
  const [queryClient] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
