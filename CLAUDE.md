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
- **Tables**: `components/ui/table`, laid out by each screen
- **Forms**: the parts in `components/vela/field.tsx` — `Field`, `FieldLabel`,
  `RequiredMark`, `FieldHint`, `FieldError`, `OptionGroup` — laid over the
  controls in `components/ui/`, with the submit handled by the screen
- **Catalog and verification**: Storybook 10 (`@storybook/nextjs`, `addon-a11y`)
  and `@storybook/test-runner`, which drives a real browser

## Architecture

```
app/                        App Router. globals.css is where the design tokens live
app/(app)/                  Routes inside the shell. (app)/_shell/ is the top bar and
                            (app)/settings/_shell/ the admin side nav, both Client
app/(app)/**/actions.ts     Server actions, beside the route that takes them
app/_components/            Parts used only under app/, too specific for components/
components/ui/*             shadcn primitives, dressed in Vela's look
components/vela/*           Vela's own components and hand-drawn SVG icons
components/theme/*          light / dark / system
components/{domain}/        A domain: its screens and the parts they are made of.
                            A screen is {name}-page.tsx exporting {Name}View; data
                            arrives as props from the RSC in app/, and the Client
                            boundary is pushed out to the leaves that need it
repository/                 Data access, and the only type boundary
repository/client/          The OpenAPI document, the client generated from it, and
                            the module that carries the session
scripts/                    codegen-verify (the client matches the document),
                            health-check (a live probe), test-alias (`@/` for
                            the unit tests, which read no tsconfig), eslint-rules
                            (the lint rules kept here, loaded as the `vela` plugin),
                            third-party-notices (the licenses the image carries)
lib/                        Pure functions, no React: display formatting, path
                            matching, cn, and the small per-domain derivations
hooks/                      React hooks shared across screens
stories/{foundations,components,screens,theme}/
tests/                      Every test. tests/lib/ and tests/repository/ mirror the
                            path of what they test; tests/storybook/ holds the
                            tests of the stories and of the story run itself
```

A screen is layered `app/` (a Server Component fetches) → `components/{domain}/`
→ `repository/` → `repository/client/`. The URL is the source of state. Fetching
data or syncing initial values in a `useEffect` is not allowed.

What the URL holds is the state a second person opening the link would need, and
that a reload has to bring back: filters, paging, sort, the search conditions. A
disclosure — which row of a list is unfolded — is not that, and putting it there
buys a server round trip for content the page was already drawn with. It is held
in client state instead.

The design system is kept outside this repository. Where a screen's wording or
shape is in question, the answer is there, not in whatever copy is at hand; the
Design System section below is what it means for the code.

Stories live under `stories/`, never beside the component. A change to a
component comes with the change to its story.

Tests live under `tests/`, never beside the code, and reach what they test by
`@/` rather than by climbing back out. `tests/storybook/` holds the tests of the
story run's own bookkeeping and the tests that read the source tree as text
rather than importing a module; each of those holds one rule across every file,
and its name says which. That directory has no leading dot because
`tests/**/*.test.ts` does not match one, and its tests would go missing without a
word.

## Data access

`repository/` is the only type boundary. A module there either calls the API
through the generated client or answers from a fixture module beside it, and a
screen cannot tell which, so the swap is a change to one file.

The client carries the browser's session, which it reads with `next/headers`, so
every module that reaches the API is server-only. A Client Component may take
**types** from `repository/` but never a value out of one of those modules — the
build stops with the import trace that got it there, and nothing before `next
build` catches it. Constants a screen needs therefore live in modules that do not
reach the API.

Nothing outside `repository/` may import the generated client, or `openapi-fetch`
directly. ESLint enforces both.

`repository/client/carina.json` is the OpenAPI document and `schema.ts` the client
generated from it. Both are committed, so `git diff` after a refetch is how the
contract moving becomes visible. Nothing notices on its own that the contract
moved — refetching is a deliberate act, which is survivable because contract
changes upstream are additive only.

Dates on screen are spelled in `Asia/Tokyo`, named in `lib/format.ts` rather than
taken from `TZ`, so a server and a browser give the same answer and a container
without `TZ` does not quietly serve times nine hours out.

`CARINA_API_BASE_URL` has no default in the code, so an unset base URL fails
instead of addressing the wrong process. Keep it that way.

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
- `max-depth` is an error past three: a block nests three deep at most, and what
  would go deeper moves into a function of its own
- `vela/max-ternary-chain` is an error from the third: one expression chains two
  ternaries at most. Two axes become a named table, and a run of steps a function
  that returns early or an exhaustive `switch`. A longer chain passes only under
  an `eslint-disable-next-line` that says why after `--`
- The version is `package.json`'s. `next.config.ts` hands it to the build as
  `VELA_VERSION` and `lib/version.ts` is what reads it, so it is not written
  down a second time

## Commands

Everything runs inside the `app` service.

```bash
docker compose exec app yarn lint             # eslint + prettier:check
docker compose exec app yarn typecheck        # tsc --noEmit
docker compose exec app yarn test             # node --test over tests/**/*.test.ts
docker compose exec app yarn build            # next build
docker compose exec app yarn build-storybook  # a static Storybook
task test:stories                             # build + test-runner, light and dark, a11y included
```

`yarn test` is Node's own runner over the TypeScript sources, so there is no test
framework to install. A module under `repository/` is tested by standing in for
`repository/client/carina` with `mock.module` and letting everything between it
and the screen run for real; `scripts/test-alias.mjs` is what makes `@/` resolve
outside the bundler. `task test:stories` runs the Storybook test-runner in a
Playwright image (the `storybook-runner` service, behind a compose profile)
against a statically served build, where every story is rendered in a real
browser and checked for a11y violations.

GitHub Actions runs lint, typecheck, the unit tests, the codegen check, the build
and the story run, on push and pull request to `master`. The story job counts the
tests it ran and fails on zero, because the runner sits beside the server it is
testing and would otherwise report the exit code of whichever half finished
first. A second workflow builds the image and starts it once to see that it serves
the login page and its stylesheet, and on `master` publishes it. A third, on a `v*`
tag, builds nothing: it refuses a tag that is not the version `package.json`
declares, and gives the image that commit was already published under the
release's tag, and `latest` when the release is the newest one that is not a
prerelease; `.github/release-latest.sh` makes that call and its `prove` runs on
every push.

`THIRD-PARTY-NOTICES.md` is checked by the image build. The `notices` stage of the
`Dockerfile` runs `next build` again with browser source maps, and
`scripts/third-party-notices.mjs` reads what was traced into `.next/standalone`
and what the source maps attribute to `node_modules`, writes the license of each
package into the image, and fails when the npm table differs. A package that
ships no license text, the ones Next.js builds into `dist/compiled` included,
needs one under `scripts/third-party-notices/npm/`, unless its `package.json`
names an author and a license whose text is under
`scripts/third-party-notices/spdx/`. Tailwind CSS is
named in the script, because the stylesheet it generates maps back to nothing in
it. A font under `public/fonts` needs its license under
`scripts/third-party-notices/fonts/`. The trace leaves `sharp` out: nothing uses
`next/image`, and sharp's prebuilt libvips is LGPL, whose source the image would
then have to carry.

`Taskfile.yml` is the place for a repeatable operation. Add a task rather than
passing a longer command around by hand.

## Screens

The shell carries every route. The viewing side — guide, live, library,
reservations, search — sits in the top nav; the admin side sits in the side nav
under settings: system, tuners, channels and their scans, encoding, the CM, OP
and ED segments, quality, authentication, display and migration. Login and the
signed-out notice sit outside the shell.

Each domain carries its own `components/{domain}/`, its own `repository/` module
and its own stories.
