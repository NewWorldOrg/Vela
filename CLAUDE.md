# next-base

A general-purpose Next.js development base: an opinionated starting point with a
shadcn/ui design system, a light/dark/system theme, a generic data-table, a
provider-agnostic data-access seam, and a Storybook that both showcases and
verifies every component.

Clone it, point the data seam at your API or DB, and build screens by writing a
repository function + columns — not by re-deriving infrastructure.

## Tech Stack

- **Framework**: Next.js 16 (App Router, RSC), React 19, TypeScript (strict).
- **Styling**: Tailwind CSS v4 (CSS-first `@theme`), shadcn/ui (`new-york` style,
  `zinc` base color, CSS variables).
- **Theme**: custom light/dark/system (cookie + middleware header + no-flash
  inline script). No `next-themes`.
- **Components**: shadcn/ui set, built on the unified `radix-ui` package + lucide
  icons.
- **Table**: `@tanstack/react-table` v8 via a generic `DataTable`.
- **Forms**: react-hook-form + zod + `@hookform/resolvers` (shadcn `form`).
- **Catalog & verification**: Storybook 10 (`@storybook/nextjs`, `addon-a11y`)
  verified with `@storybook/test-runner` (Playwright-powered).

## Architecture

Layered, top to bottom:

```
app/{module}/page.tsx                      Server Component: calls a repository, passes initial data
components/page-component/{Module}*.tsx    Client: URL/list state, per-page persistence, refetch
components/{feature}/*.tsx                  Client: ColumnDef[] -> DataTable; feature-specific UI
components/common/DataTable.tsx            Generic table (sticky header, relative widths, fill&scroll)
components/ui/*                            shadcn primitives
repository/{module}Repository.ts           Typed functions; take a DataSource, return typed DTOs
lib/data-source/                           The seam: DataSource interface + in-memory mock impl
hooks/                                     useListUrlState, usePerPageLocalStorage
```

**Data-access seam**: repositories never talk to a transport directly — they
take a `DataSource`. The default implementation is in-memory/mock. A real
`http`/`db` implementation can drop in by changing only `lib/data-source` wiring,
without touching repository signatures or UI.

**Naming / conventions**:

- Import alias: `@/*` maps to the repo root (`@/lib/utils`, `@/components/ui/...`).
- Prettier: single quotes, no semicolons. Run `yarn prettier` after any
  `shadcn add` (generated code uses double-quote/semi and will fail lint).
- Components import from the unified `radix-ui` package, not per-primitive
  packages.

## CI Commands

All commands run inside the Docker `app` service.

```bash
docker compose exec app yarn lint        # eslint + prettier:check
docker compose exec app yarn typecheck   # tsc --noEmit
docker compose exec app yarn build       # next build
```

Component verification (Playwright-powered, via the Storybook test-runner):

```bash
task test:stories                        # build-storybook + serve + test-storybook
```

GitHub Actions runs `lint` + `typecheck` on push/PR to `master`.

## Docker Config

- Compose service: `app` (image `node:25.2-slim`, `working_dir: /code`, repo
  mounted at `/code`).
- Dev server published at **http://localhost:8080** (`8080 -> 3000`).
- Run everything through the container, e.g. `docker compose exec app yarn dev`.
- `task` shortcuts: `task up`, `task dev`, `task lint`, `task typecheck`,
  `task test:stories`.

## UI Hostname

http://localhost:8080

## Implementation Phases

0. Walking skeleton — Docker/tsconfig pre-flight, Tailwind v4 + tokens, shadcn +
   button, theme infra, Storybook + test-runner green (gate).
1. Component breadth — form controls, data display, overlays + menus (each with
   stories).
2. Layer structure + generic DataTable + an example `/users` list page proving
   the full stack end-to-end.
3. Form (react-hook-form + zod) example + conventions doc.
