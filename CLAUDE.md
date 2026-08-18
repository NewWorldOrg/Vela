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
components/{domain}/         A domain: its screens and the parts they are made of.
                            A screen is `{name}-page.tsx`; data arrives as props from
                            the RSC in app/ and the Client boundary is pushed to the
                            leaves that need it
repository/                 Data access, and the only type boundary (fixtures for now)
repository/client/          carina.json is the OpenAPI document, fetched from the
                            running API, and schema.ts the client generated from it.
                            Both are committed. Nothing outside repository/ may
                            import the client — eslint enforces it
scripts/                    codegen-verify (the client matches the document),
                            health-check (a live probe)
lib/                        Pure functions: cn, path matching, display formatting
hooks/                      useListUrlState / usePerPageLocalStorage
types/                      DataTable types
stories/{foundations,components,screens,common,theme}/
```

A screen is layered `app/` (a Server Component fetches) → `components/{domain}/` →
`components/common/` → `repository/` → `client/`. `repository/` is the only type
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
docker compose exec app yarn codegen:fetch    # refetch the document, regenerate the client
docker compose exec app yarn codegen:verify   # regenerate the client, fail on a diff
task test:stories                             # build + test-runner, a11y included
```

GitHub Actions runs lint, typecheck, the codegen check and build on push and pull
request to `master`.

`codegen:fetch` overwrites `repository/client/carina.json` with what the running API
at `CARINA_API_BASE_URL` serves and regenerates the client from it, so `git diff`
after a fetch is how the contract moving becomes visible. Both files are committed:
`codegen:verify` regenerates the client from the committed document into a scratch
file and fails on any difference, which needs nothing running and so belongs in CI.
Nothing notices on its own that the contract moved — refetching is a deliberate act,
which is survivable because contract changes upstream are additive only.

## Docker Config

- compose service: `app` (`node:25.2-slim`, `working_dir: /code`, the repository
  mounted at `/code`)
- dev server: `8080 -> 3000`. Storybook: `6006`
- `CARINA_API_BASE_URL` is where `repository/` reads the API. It has no default in
  the code — an unset base URL fails instead of addressing the wrong process — so
  compose supplies one and reaches the host through `host.docker.internal`
- `DEV_ALLOWED_ORIGINS` feeds `allowedDevOrigins`. It takes host names without a
  port; without the host the browser uses, the dev server refuses the chunks and
  the HMR socket
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
2. API — generate a client from the document the API serves and keep it inside
   `repository/`
