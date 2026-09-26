# AI Proposal Generator — Web

Next.js frontend for the AI Proposal Generator. It talks to the Spring Boot API (`ai-proposal-generator-api`) over REST.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript (strict) · Tailwind CSS 4 · shadcn/ui (Radix) · TanStack Query · Zod · Vitest + React Testing Library + MSW · Playwright

UI follows the **Minimalist Modern** design system and its **App UI** section. Tokens live in `src/app/globals.css`, mirrored from the design system's `tokens.json`. Fonts are self-hosted from npm (`@fontsource`), so builds need no Google Fonts access.

## Getting started

```bash
cp .env.example .env.local   # set NEXT_PUBLIC_API_BASE_URL (default http://localhost:8080)
npm install
npm run dev                  # http://localhost:3000
```

The backend must allow the frontend origin in CORS (`APP_CORS_ALLOWED_ORIGINS`, default `http://localhost:3000`). In development, **Developer › System health** (`/dev/health`) calls `GET /actuator/health` to check the connection. The page is not available in production builds.

## Scripts

| Script                            | What it does                                                     |
| --------------------------------- | ---------------------------------------------------------------- |
| `npm run dev`                     | Dev server                                                       |
| `npm run build` / `npm start`     | Production build / serve                                         |
| `npm run lint`                    | ESLint (Next.js core-web-vitals + TypeScript)                    |
| `npm run typecheck`               | `tsc --noEmit`                                                   |
| `npm run format` / `format:check` | Prettier (with Tailwind class sorting)                           |
| `npm test` / `test:watch`         | Vitest unit and component tests                                  |
| `npm run e2e`                     | Playwright end-to-end tests (starts the dev server on port 3100) |

A Husky pre-commit hook runs `lint-staged` (ESLint + Prettier on staged files). CI (`.github/workflows/ci.yml`) runs lint, typecheck, format check, unit tests, build and E2E.

For E2E, run `npx playwright install chromium` once. To reuse an existing Chromium instead, set `PLAYWRIGHT_CHROMIUM_PATH`.

## Environment

Validated with Zod at startup and build (`src/config/env.ts`); an invalid value stops the app with a clear message.

| Variable                   | Required | Description                                     |
| -------------------------- | -------- | ----------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | yes      | Base URL of the API, http(s), no trailing slash |

Only `NEXT_PUBLIC_*` variables are used, and all of them are visible in the browser: never put secrets in them.

## Project structure

```text
src/
  app/                 Routes (App Router). (app)/ = pages inside the app shell
  components/
    ui/                Design-system primitives (shadcn/ui based): Button, StatusBadge, …
    layout/            App shell: sidebar, top bar, page header
  config/              Env schema, navigation
  features/<feature>/  Feature modules: API calls, hooks, components, tests (see src/features/README.md)
  lib/                 Cross-cutting helpers: API client, cn()
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
