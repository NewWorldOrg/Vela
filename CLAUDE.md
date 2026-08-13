# Vela

Frontend of a self-hosted recording system for Japanese digital broadcasting. It
holds the design system (tokens, component library, Storybook) and the app shell
with every route in place. Screens are filled in one domain at a time; the routes
for `/logged-out`, settings > authentication and the reservation outcome ledger
arrive with the domains that own them.

## Tech Stack

- **Framework**: Next.js 16 (App Router, RSC), React 19, TypeScript (strict)
- **Styling**: Tailwind CSS v4 (CSS-first `@theme`), shadcn/ui (`new-york`)
- **Theme**: a light / dark / system implementation of its own — cookie, a
  middleware header and a no-flash inline script. `next-themes` is not used
- **Components**: shadcn primitives (the unified `radix-ui` package) pulled
  towards Vela's tokens and feel, plus the components in `components/vela/`
- **Table**: a general `DataTable` over `@tanstack/react-table` v8
- **Catalog and verification**: Storybook 10 (`@storybook/nextjs`, `addon-a11y`)
  and `@storybook/test-runner` (Playwright)

## Architecture

```
app/                        App Router. globals.css is where the design tokens live
app/(app)/                  Routes inside the shell. (app)/_shell/ is the top bar and
                            (app)/settings/_shell/ the admin side nav, both Client
app/_components/            Parts used only under app/, too specific for components/
components/ui/*             shadcn primitives, dressed in Vela's look
components/vela/*           Vela's own components and hand-drawn SVG icons
components/theme/*          light / dark / system
components/common/*         the general DataTable
page-component/{screen}/    A screen. Data arrives as props from the RSC in app/;
                            the Client boundary is pushed to the leaves that need it
feature/{domain}/           Parts shared across screens (chips, dialogs)
repository/                 Data access, and the only type boundary (fixtures for now)
repository/client/          The client generated from the OpenAPI document. Nothing
                            outside repository/ may import it — eslint enforces it
openapi/                    The consumed contract: a copy of the API repository's
                            OpenAPI document at a pinned commit. See openapi/README.md
scripts/                    openapi-sync (refresh the copy), health-check (a live probe)
lib/                        Pure functions: cn, path matching, display formatting
hooks/                      useListUrlState / usePerPageLocalStorage
types/                      DataTable types
stories/{foundations,components,screens,common,theme}/
```

A screen is layered `app/` (a Server Component fetches) → `page-component/` →
`feature/` → `common/` → `repository/` → `client/`. `repository/` is the only type
boundary, and the URL is the source of state. Fetching data or syncing initial
values in a `useEffect` is not allowed.

**Naming and conventions**

- Import alias: `@/*` is the repository root
- Prettier: single quotes, no semicolons. Always run `yarn prettier` after
  `shadcn add`
- Import primitives from the unified `radix-ui` package
- A change to a component comes with the change to its story

## Design System

The canon is "a small digital toy". What that means in the code:

- **A border and a shadow mean it can be pressed, or it is floating.** A plain
  grouping of information is a `Surface` or a `TintPanel`, with neither; the
  things you press are `Tile` and `Button`
- **Shadows are never blurred.** `shadow-pop` (2px) → hover `shadow-pop-lg` (3px)
  and a 1px lift → active `shadow-pop-none` and a 1px sink. Floating things get
  `shadow-pop-xl` (4px)
- **The primary button is a pill.** There are no square filled buttons
- **A filled button is `bg-btn-fill` / `text-on-btn`.** Never `--accent` as a
  background: dark mode switches to a pale teal fill with dark text
- **Sections are separated by a tint, not by a rule.** Text stays `text-ink` and
  saturation stays down. Three or four tints per screen at most
- **Icons are drawn in `components/vela/icons.tsx`.** They are not replaced with a
  general icon set. 24x24, stroke 1.6, round caps, no fill
- **No animation that loops forever** — no blinking, pulsing or spinning. The one
  exception is `Spinner`
- **The wording does not change.** Terms are not softened to suit a design
- Not allowed: gradient backgrounds, blurred shadows, monospace for blocks of
  text, large areas of saturated colour, large areas of pure black or white,
  emoji as icons, decoration that means nothing

## CI Commands

Everything runs inside the `app` service.

```bash
docker compose exec app yarn lint             # eslint + prettier:check
docker compose exec app yarn typecheck        # tsc --noEmit
docker compose exec app yarn build            # next build
docker compose exec app yarn build-storybook  # a static Storybook
docker compose exec app yarn openapi:verify   # regenerate the client, fail on a diff
task test:stories                             # build + test-runner, a11y included
```

GitHub Actions runs lint, typecheck, the OpenAPI regeneration check and build on
push and pull request to `master`.

## Docker Config

- compose service: `app` (`node:25.2-slim`, `working_dir: /code`, the repository
  mounted at `/code`)
- dev server: `8080 -> 3000`. Storybook: `6006`
- `task` shortcuts: `task up`, `task dev`, `task storybook`, `task lint`,
  `task typecheck`, `task test:stories`

## UI Hostname

- Dev server: port 8080 on the host
- Storybook: port 6006 on the host

## Implementation Phases

0. Design system — tokens, component library, Storybook
1. **Screens (here now)** — the viewing side (guide, live, library, reservations)
   sits in the top nav; the admin side (tuners, channels, encoding, quality,
   system) sits in the side nav under settings
2. API — generate a client from the OpenAPI document and keep it inside
   `repository/`
