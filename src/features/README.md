# Features

One folder per business feature. A feature owns everything specific to it and exposes only what pages need.

```text
features/<feature>/
  api.ts                 API calls + Zod schemas for responses (via lib/api/client)
  use-<thing>.ts         TanStack Query hooks (query keys live next to the hook)
  <component>.tsx        Feature components
  <component>.test.tsx   Component tests (MSW for HTTP)
```

Planned folders, created with their stories: `auth`, `workspaces`, `proposals`, `documents`, `requirements`, `outline`, `editor`, `evidence`, `versions`, `review`, `approval`, `exports`.

Rules:

- Pages in `src/app` stay thin: they compose feature components.
- A feature may import from `components/`, `lib/` and `config/`, not from another feature's internals. Anything shared by two features moves to `components/` or `lib/`.
- Shared UI primitives live in `components/ui`; do not re-style them per feature.
- A feature with an `index.ts` is imported only through it (e.g. `@/features/workspaces`).
- Current features: `auth` (US-FE-02), `workspaces` (US-FE-03: current user, workspace context, switcher, profile), `system-health` (developer-only backend status, US-FE-01 AC5).
