# AI Proposal Generator — Web

Next.js frontend for the AI Proposal Generator. It talks to the Spring Boot API (`ai-proposal-generator-api`) over REST.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript (strict) · Tailwind CSS 4 · shadcn/ui (Radix) · TanStack Query · Zod · Vitest + React Testing Library + MSW · Playwright

UI follows the **Minimalist Modern** design system and its **App UI** section. Tokens live in `src/app/globals.css`, mirrored from the design system's `tokens.json`. Fonts are self-hosted from npm (`@fontsource`), so builds need no Google Fonts access.

## Getting started

Requires **Node.js ≥ 22.12** (Vite 8 / Rolldown used by Vitest). `.npmrc` sets `engine-strict=true`, so an older Node fails the install with a clear error instead of silently skipping native packages.

```bash
cp .env.example .env.local   # set API_BASE_URL (default http://localhost:8080)
npm install
npm run dev                  # http://localhost:3000
```

The browser never calls the API directly. Next.js acts as a **BFF** (FDEC-03): `/api/auth/*` signs in/out and keeps the tokens in HttpOnly cookies, `/api/backend/*` forwards allow-listed API calls with the token attached. In development, **Developer › System health** (`/dev/health`) checks `GET /actuator/health` through the BFF. The page is not available in production builds.

## Scripts

| Script                            | What it does                                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `npm run dev`                     | Dev server                                                                                                |
| `npm run build` / `npm start`     | Production build / serve                                                                                  |
| `npm run lint`                    | ESLint (Next.js core-web-vitals + TypeScript)                                                             |
| `npm run typecheck`               | `tsc --noEmit`                                                                                            |
| `npm run format` / `format:check` | Prettier (with Tailwind class sorting)                                                                    |
| `npm test` / `test:watch`         | Vitest unit and component tests                                                                           |
| `npm run e2e`                     | Playwright end-to-end tests (starts a mock API on 3199 and the dev server on 3100)                        |
| `npm run api:types`               | Regenerate `src/lib/api/schema.d.ts` from the running API's OpenAPI (`http://localhost:8080/v3/api-docs`) |

A Husky pre-commit hook runs `lint-staged` (ESLint + Prettier on staged files). CI (`.github/workflows/ci.yml`) runs lint, typecheck, format check, unit tests, build and E2E.

For E2E, run `npx playwright install chromium` once. To reuse an existing Chromium instead, set `PLAYWRIGHT_CHROMIUM_PATH`.

## Environment

Validated with Zod at startup and build (`src/config/env.ts`); an invalid value stops the app with a clear message. Both variables are **server-only**; nothing is exposed to the browser.

| Variable         | Required | Description                                                 |
| ---------------- | -------- | ----------------------------------------------------------- |
| `API_BASE_URL`   | yes      | Base URL of the Spring Boot API, http(s), no trailing slash |
| `API_TIMEOUT_MS` | no       | Timeout for BFF → API calls in ms (default 30000)           |

## Authentication (BFF, FDEC-03)

| Piece                          | Where                                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Sign in / sign out             | `src/app/api/auth/login`, `src/app/api/auth/logout` (route handlers)                                        |
| API proxy with token + refresh | `src/app/api/backend/[...path]` — allow-list: `api/**` except `api/auth/**`, and `actuator/health`          |
| Cookies                        | `apg_at` (access, ~15 min) and `apg_rt` (refresh, 14 days): `HttpOnly; Secure; SameSite=Lax; Path=/`        |
| CSRF                           | state-changing BFF requests must be same-origin (`src/server/csrf.ts`)                                      |
| Route protection               | `src/proxy.ts` (Next 16's `middleware`): redirects to `/login?returnUrl=…`, renews an expired access cookie |
| Session end in the UI          | any `401` from the BFF → full navigation to `/login` (`src/app/providers.tsx`)                              |

Tokens never reach JavaScript, `localStorage` or `sessionStorage`. The BFF forwards the client IP in `X-Forwarded-For`; the API must trust that header **only** from the BFF.

## Project structure

```text
src/
  app/                 Routes (App Router). (app)/ = pages inside the app shell
  components/
    ui/                Design-system primitives (shadcn/ui based): Button, StatusBadge, …
    layout/            App shell: sidebar, top bar, page header
  config/              Env schema, navigation
  features/<feature>/  Feature modules: API calls, hooks, components, tests (see src/features/README.md)
  lib/                 Cross-cutting helpers: API client, cn(), safe returnUrl
  server/              Server-only BFF helpers: backend fetch, session cookies, CSRF
  proxy.ts             Route protection (runs before pages)
  mocks/               MSW handlers for tests
  test/                Test setup and render helpers
e2e/                   Playwright specs
```

## Conventions

- Types for API payloads come from the backend OpenAPI (added with US-FE-04); do not hand-write duplicates.
- Validate API responses with Zod before use; never trust server or AI output blindly.
- Render document and AI content as text; never inject HTML that has not been sanitised.
- No tokens in `localStorage`/`sessionStorage`. Browser storage is only for UI preferences.
- Every screen has loading, empty and error states.
