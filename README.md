# next-base

A general-purpose [Next.js](https://nextjs.org) base: an opinionated starting
point with a shadcn/ui design system, a light/dark/system theme, a generic data
table, a provider-agnostic data-access seam, and a Storybook that both showcases
and verifies every component.

Clone it, point the data seam at your API or DB, and build screens by writing a
repository function + columns — not by re-deriving infrastructure.

## Stack

- **Next.js 16** (App Router, RSC) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** (CSS-first `@theme`) + **shadcn/ui** (`new-york`, `zinc`)
- Custom **light/dark/system theme** (cookie + middleware + no-flash script; no
  `next-themes`)
- **@tanstack/react-table v8** via a generic `DataTable`
- **react-hook-form + zod** for forms
- **Storybook 10** + `@storybook/test-runner` (Playwright-powered) for the
  catalog and verification

## Getting started

Everything runs inside the Docker `app` service (Node, `working_dir: /code`).

```bash
docker compose up -d                 # or: task up
docker compose exec app yarn dev     # or: task dev
```

Open <http://localhost:8080>. The example list screen is at `/users`.

### Common commands

```bash
docker compose exec app yarn lint        # eslint + prettier:check   (task lint)
docker compose exec app yarn typecheck   # tsc --noEmit              (task typecheck)
docker compose exec app yarn build       # next build
docker compose exec app yarn storybook   # Storybook dev on :6006
task test:stories                        # build + run the Storybook test-runner
```

## Project structure

```
app/(app)/layout.tsx                      Wraps the app routes in the AppShell
app/(app)/{module}/page.tsx               Server Component: calls a repository, passes initial data
components/layout/{AppShell,SideNav}.tsx  Sidebar + header chrome; navConfig.tsx lists nav items
components/page-component/{Module}*.tsx   Client: URL/list state, per-page persistence, refetch
components/{feature}/*                     Client: ColumnDef[] → DataTable; feature UI
components/common/DataTable.tsx           Generic table (sticky header, relative widths, fill&scroll)
components/ui/*                            shadcn primitives
repository/{module}Repository.ts          Typed functions; take a DataSource, return typed DTOs
lib/data-source/                          The seam: DataSource interface + in-memory mock
lib/dataSource.ts                         The app's DataSource instance (swap point)
hooks/                                    useListUrlState, usePerPageLocalStorage
types/dataTable.ts                        SortState, PaginationState, PageSize, column types
stories/                                  One story per component (+ DataTable, AppShell, form)
```

The `@/*` import alias maps to the repo root (`@/components/ui/button`, …).

## App shell

Routes under `app/(app)/` render inside `AppShell` (collapsible sidebar +
header + a fill main area). The example screens — `/dashboard`, `/users`,
`/settings` — all live there; list pages fill the viewport and scroll
internally. The header shows the page title, derived from the active item in
`components/layout/navConfig.tsx` — edit that file to change the sidebar items,
app name, and per-route titles. Public pages (e.g. the landing `/`) stay
outside the group.

Storybook leads with the composed screens (the `Pages/*` stories render the
real Dashboard / Users / Settings views inside the shell); the raw `ui/*`
primitives are grouped last.

## Theme

Three states — light / dark / system. A cookie (`next-base-theme-mode`) is read
by `middleware.ts` into an `x-theme-mode` header so the root layout can render
the right theme at SSR; a no-flash inline script handles the `system` case
before paint. Drop `<ThemeToggle />` anywhere inside the `ThemeProvider`.

Tokens are standard shadcn `zinc` plus `success` / `warning` / `info` and
`table-header`, exposed as Tailwind utilities (`bg-success`, `text-warning`, …).

## Adding a component

```bash
docker compose exec app sh -c "npx shadcn@latest add <name>"
docker compose exec app yarn prettier   # generated code is double-quote/semi; reformat to repo style
```

Then add a story under `stories/` (`title: 'UI/<Name>'`). For interaction or
a11y assertions, use a `play` function with helpers from `storybook/test`. Run
`task test:stories` to verify in a real browser.

## Adding a list screen

The example `/users` screen shows the full flow. To add your own (e.g. `posts`):

1. **Repository** — `repository/postsRepository.ts`: a `Post` type plus
   `listPosts(dataSource, query)` / `getPost(dataSource, id)` that delegate to
   the `DataSource`.
2. **Seed (mock)** — add the collection to `lib/dataSource.ts`:
   `posts: { idField: 'id', records: postSeed }`.
3. **Columns** — `components/posts/columns.tsx`: `ColumnDef<Post>[]` with
   `meta` (`minWidthPx`, `sticky: 'left'`, `sortingField`, `truncate`) and a
   `ColumnVisibilityOption[]`.
4. **Table** — `components/posts/PostsListTable.tsx`: render `<DataTable>` with
   those columns.
5. **Page-component** — `components/page-component/PostsListPage.tsx`: wire
   `useListUrlState` + `usePerPageLocalStorage`, refetch via the repository.
6. **Route** — `app/posts/page.tsx`: a Server Component that reads `searchParams`,
   fetches the first page, and renders the page-component.

## Plugging in a real API or DB

Repositories depend only on the `DataSource` interface
(`list(collection, query)` / `find(collection, id)`), so the transport is a
single swap point. Implement `DataSource` against your backend:

```ts
// lib/data-source/http.ts
import type { DataSource } from '@/lib/data-source'

export function createHttpDataSource(baseUrl: string): DataSource {
  return {
    async list(collection, query) {
      const res = await fetch(`${baseUrl}/${collection}?` + toParams(query))
      return res.json() // shape: { items, total, page, perPage, lastPage }
    },
    async find(collection, id) {
      const res = await fetch(`${baseUrl}/${collection}/${id}`)
      return res.ok ? res.json() : null
    },
  }
}
```

Then change only `lib/dataSource.ts` to construct it. Repositories, columns,
tables, and pages stay untouched.

## Verification

Component verification is the Storybook test-runner: it renders every story in a
real browser (via Playwright) and runs each story's `play`/a11y checks. It runs
in Docker against a built, statically-served Storybook:

```bash
task test:stories
```
