# Vela

Frontend of a self-hosted recording system for Japanese digital broadcasting:
browsing the programme guide, reserving, and searching and playing back what was
recorded. The recording itself belongs to the backend, which Vela reaches through
a client generated from the OpenAPI document that backend serves.

`README.md` is for running this — setup, configuration, the codegen commands.
This file is for changing it, and does not repeat what is there.

## Tech Stack

- **Framework**: Next.js 16 (App Router, RSC), React 19, TypeScript in strict mode
- **Styling**: Tailwind CSS v4 with a CSS-first `@theme`, shadcn/ui (`new-york`)
- **Theme**: a light / dark / system implementation of its own — a cookie, a
  middleware request header and a no-flash inline script. `next-themes` is not used
- **Components**: shadcn primitives from the unified `radix-ui` package, pulled
  towards Vela's tokens and feel, plus the components in `components/vela/`
- **Table**: one general `DataTable` over `@tanstack/react-table` v8
- **Forms**: the parts in `components/vela/field.tsx` — `Field`, `FieldLabel`,
  `RequiredMark`, `FieldHint`, `FieldError`, `OptionGroup` — laid over the
  controls in `components/ui/`, with the submit handled by the screen.
  `components/ui/form.tsx`, `react-hook-form`, `zod` and `@hookform/resolvers`
  are installed and imported by nothing
- **Catalog and verification**: Storybook 10 (`@storybook/nextjs`, `addon-a11y`)
  and `@storybook/test-runner`, which drives a real browser

## Architecture

```
app/                        App Router. globals.css is where the design tokens live
app/(app)/                  Routes inside the shell. (app)/_shell/ is the top bar and
                            (app)/settings/_shell/ the admin side nav, both Client
app/(app)/**/actions.ts     Server actions, beside the route that takes them
app/api/events/             Relays the API's event stream so the browser can
                            subscribe same-origin. A deployment that routes /api
                            straight to the API answers before this is reached
app/_components/            Parts used only under app/, too specific for components/
components/ui/*             shadcn primitives, dressed in Vela's look
components/vela/*           Vela's own components and hand-drawn SVG icons
components/theme/*          light / dark / system
components/common/*         the general DataTable
components/{domain}/        A domain: its screens and the parts they are made of.
                            A screen is {name}-page.tsx exporting {Name}View; data
                            arrives as props from the RSC in app/, and the Client
                            boundary is pushed out to the leaves that need it
repository/                 Data access, and the only type boundary
repository/client/          The OpenAPI document, the client generated from it, and
                            the module that carries the session
scripts/                    codegen-verify (the client matches the document),
                            health-check (a live probe)
lib/                        Pure functions, no React: display formatting, path
                            matching, cn, and the small per-domain derivations
hooks/                      useListUrlState / usePerPageLocalStorage / useDismissable
types/                      DataTable types
stories/{foundations,components,screens,common,theme}/
```

A screen is layered `app/` (a Server Component fetches) → `components/{domain}/`
→ `components/common/` → `repository/` → `repository/client/`. The URL is the
source of state. Fetching data or syncing initial values in a `useEffect` is not
allowed.

What the URL holds is the state a second person opening the link would need, and
that a reload has to bring back: filters, paging, sort, the search conditions. A
disclosure — which row of a list is unfolded — is not that, and putting it there
buys a server round trip for content the page was already drawn with. It is held
in client state instead.

The design system lives outside this repository and is not mirrored here. Where a
screen's wording or shape is in question, the answer is there, not in whatever
copy is at hand: a stale copy has already been used once to undo wording the
design side had deliberately changed.

Stories live under `stories/`, never beside the component. A change to a
component comes with the change to its story.

## Data access

`repository/` is the only type boundary. A module there either calls the API
through the generated client or answers from a fixture module beside it, and a
screen cannot tell which — which is what lets a screen be built and reviewed
before its endpoint exists, and lets the swap be a change to one file.

The client carries the browser's session, which it reads with `next/headers`, so
every module that reaches the API is server-only. A Client Component may take
**types** from `repository/` but never a value out of one of those modules — the
build stops with the import trace that got it there, and nothing before `next
build` catches it. Constants a screen needs therefore live in modules that do not
reach the API: `channels`, `events`, `scan-systems`, `scan-failures`,
`search-options`.

Nothing outside `repository/` may import the generated client, or `openapi-fetch`
directly. ESLint enforces both.

`repository/client/carina.json` is the OpenAPI document and `schema.ts` the client
generated from it. Both are committed, so `git diff` after a refetch is how the
contract moving becomes visible. `codegen:fetch` overwrites the document with what
the running API serves and regenerates; `codegen:verify` regenerates from the
committed document into a scratch file and fails on any difference, which needs
nothing running and so is what CI runs. Nothing notices on its own that the
contract moved — refetching is a deliberate act, which is survivable because
contract changes upstream are additive only.

Dates on screen are spelled in `Asia/Tokyo`, named in `lib/format.ts` rather than
taken from `TZ`, so a server and a browser give the same answer and a container
without `TZ` does not quietly serve times nine hours out.

## Design System

The canon is "a small digital toy". What that means in the code:

- **A border and a shadow mean it can be pressed, or it is floating.** A plain
  grouping of information is a `Surface` or a `TintPanel`, with neither; the
  things you press are `Tile` and `Button`
- **Shadows are never blurred.** They are hard offsets: `shadow-pop` (2px) →
  hover `shadow-pop-lg` (3px) and a 1px lift → active `shadow-pop-none` and a 1px
  sink. Floating things get `shadow-pop-xl` (4px). The shared feel lives in
  `components/vela/tactile.ts`; pair it rather than rewriting the transition
- **The primary button is a pill.** There are no square filled buttons
- **A filled button is `bg-btn-fill` / `text-on-btn`.** Never `--accent` as a
  background: dark mode switches to a pale fill with dark text
- **Sections are separated by a tint, not by a rule.** Text stays `text-ink` and
  saturation stays down. Three or four tints per screen at most
- **Icons are drawn in `components/vela/icons.tsx`.** They are not replaced with
  a general icon set. 24x24, stroke 1.6, round caps, no fill
- **Contrast is a constraint on the tokens, not a per-screen fix.** The ink steps
  are set where the a11y gate accepts them at the sizes they are used
- **No animation that loops forever** — no blinking, pulsing or spinning. The one
  exception is `Spinner`
- **The wording does not change.** Terms are not softened to suit a design
- Not allowed: gradient backgrounds, blurred shadows, monospace for blocks of
  text, large areas of saturated colour, large areas of pure black or white,
  emoji as icons, decoration that means nothing

## Conventions

- Import alias: `@/*` is the repository root
- Prettier: single quotes, no semicolons. Always run `yarn prettier` after
  `shadcn add`
- Import primitives from the unified `radix-ui` package
- `curly` is an error: a branch always has braces

## Commands

Everything runs inside the `app` service.

```bash
docker compose exec app yarn lint             # eslint + prettier:check
docker compose exec app yarn typecheck        # tsc --noEmit
docker compose exec app yarn test             # node --test over lib/**/*.test.ts
docker compose exec app yarn build            # next build
docker compose exec app yarn build-storybook  # a static Storybook
task test:stories                             # build + test-runner, a11y included
```

`yarn test` is Node's own runner over the TypeScript sources, so there is no test
framework to install. `task test:stories` runs the Storybook test-runner in a
Playwright image against a statically served build, which is where every story is
rendered in a real browser and checked for a11y violations.

GitHub Actions runs lint, typecheck, the unit tests, the codegen check, the
build and the story run, on push and pull request to `master`. The story job
counts the tests it ran and fails on zero, because the runner sits beside the
server it is testing and would otherwise report the exit code of whichever half
finished first.

`Taskfile.yml` is the place for a repeatable operation. Add a task rather than
passing a longer command around by hand.

## Development environment

One `app` service on the repository mounted at `/code`, publishing the dev server
on 8080 and Storybook on 6006, plus a `storybook-runner` service behind a profile
that exists only for `task test:stories`.

`CARINA_API_BASE_URL` has no default in the code — an unset base URL fails
instead of addressing the wrong process — so compose supplies one.
`DEV_ALLOWED_ORIGINS` feeds `allowedDevOrigins` and takes host names without a
port; without the host the browser actually uses, the dev server refuses the
chunks and the HMR socket.

## Screens

The shell carries every route. The viewing side — guide, live, library,
reservations, search — sits in the top nav; the admin side sits in the side nav
under settings: tuners, channels and their scans, encoding, quality, migration,
authentication and system. Login and the signed-out notice sit outside the shell.

Screens land one domain at a time, each finished through to merge before the next
one starts, and each carries its own `components/{domain}/`, its own
`repository/` module and its own stories.
