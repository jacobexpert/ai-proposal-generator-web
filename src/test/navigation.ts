import { useSyncExternalStore } from "react";
import { vi } from "vitest";

/**
 * A tiny URL store for `next/navigation` in component tests: `router.replace/push` change the
 * search params and re-render subscribers, like the real App Router.
 */
export function createNavigation(initial = "/") {
  let url = new URL(initial, "http://localhost:3000");
  const listeners = new Set<() => void>();
  let snapshot = new URLSearchParams(url.search);
  const set = (href: string) => {
    url = new URL(href, url);
    snapshot = new URLSearchParams(url.search);
    listeners.forEach((l) => l());
  };
  const router = {
    replace: vi.fn((href: string) => set(href)),
    push: vi.fn((href: string) => set(href)),
    refresh: vi.fn(),
    back: vi.fn(),
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };
  return {
    router,
    set,
    get pathname() {
      return url.pathname;
    },
    module: {
      useRouter: () => router,
      usePathname: () => useSyncExternalStore(subscribe, () => url.pathname),
      useSearchParams: () => useSyncExternalStore(subscribe, () => snapshot),
      useParams: () => ({}),
      notFound: () => {
        throw new Error("notFound");
      },
      redirect: vi.fn(),
    },
  };
}
