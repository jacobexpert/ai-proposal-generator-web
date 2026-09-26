"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { ApiError } from "@/lib/api/client";
import { loginUrl } from "@/lib/return-url";

/**
 * US-FE-02 AC5: the BFF already refreshed the token when it could, so a 401 reaching the
 * browser means the session is over. A full navigation (not a client transition) is used so
 * `beforeunload` guards of screens with unsaved changes still warn the user first.
 */
export function redirectToLoginOnUnauthorized(error: unknown): void {
  if (!(error instanceof ApiError) || error.status !== 401 || typeof window === "undefined") return;
  const { pathname, search } = window.location;
  if (pathname === "/login") return;
  window.location.assign(loginUrl(`${pathname}${search}`));
}

export function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({ onError: redirectToLoginOnUnauthorized }),
    mutationCache: new MutationCache({ onError: redirectToLoginOnUnauthorized }),
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
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
