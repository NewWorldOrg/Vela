# Third-party notices

Vela is licensed under AGPL-3.0-only (`LICENSE`). This file names what the
container image carries beside Vela. The image keeps this file, `LICENSE` and the
license texts named below under `/usr/share/doc/vela/`.

Building the image fails when the npm table below differs from what the image
carries: the packages under `node_modules` that the build traces into it, and the
packages whose code the build bundles into its output.

## Node.js

The image runs on Node.js from the base image `node:24.21-slim`. Its license,
which includes the licenses of the libraries Node.js is built with, is
`/usr/local/LICENSE`, and a copy is at `/usr/share/doc/vela/node/LICENSE`.

## npm packages

The license of each package is under
`/usr/share/doc/vela/npm/<package>/<version>/`, and the versions the image carries
are in `/usr/share/doc/vela/npm/packages.tsv`. A package that ships no license
file has one written there from the license its `package.json` states.

| Package | License |
| --- | --- |
| `@floating-ui/core` | MIT |
| `@floating-ui/dom` | MIT |
| `@floating-ui/react-dom` | MIT |
| `@floating-ui/utils` | MIT |
| `@next/env` | MIT |
| `@radix-ui/number` | MIT |
| `@radix-ui/primitive` | MIT |
| `@radix-ui/react-alert-dialog` | MIT |
| `@radix-ui/react-arrow` | MIT |
| `@radix-ui/react-checkbox` | MIT |
| `@radix-ui/react-collection` | MIT |
| `@radix-ui/react-compose-refs` | MIT |
| `@radix-ui/react-context` | MIT |
| `@radix-ui/react-dialog` | MIT |
| `@radix-ui/react-direction` | MIT |
| `@radix-ui/react-dismissable-layer` | MIT |
| `@radix-ui/react-dropdown-menu` | MIT |
| `@radix-ui/react-focus-guards` | MIT |
| `@radix-ui/react-focus-scope` | MIT |
| `@radix-ui/react-id` | MIT |
| `@radix-ui/react-label` | MIT |
| `@radix-ui/react-menu` | MIT |
| `@radix-ui/react-popover` | MIT |
| `@radix-ui/react-popper` | MIT |
| `@radix-ui/react-portal` | MIT |
| `@radix-ui/react-presence` | MIT |
| `@radix-ui/react-primitive` | MIT |
| `@radix-ui/react-roving-focus` | MIT |
| `@radix-ui/react-select` | MIT |
| `@radix-ui/react-slot` | MIT |
| `@radix-ui/react-switch` | MIT |
| `@radix-ui/react-tooltip` | MIT |
| `@radix-ui/react-use-callback-ref` | MIT |
| `@radix-ui/react-use-controllable-state` | MIT |
| `@radix-ui/react-use-effect-event` | MIT |
| `@radix-ui/react-use-is-hydrated` | MIT |
| `@radix-ui/react-use-layout-effect` | MIT |
| `@radix-ui/react-use-previous` | MIT |
| `@radix-ui/react-use-size` | MIT |
| `@radix-ui/react-visually-hidden` | MIT |
| `@swc/helpers` | Apache-2.0 |
| `aria-hidden` | MIT |
| `class-variance-authority` | Apache-2.0 |
| `client-only` | MIT |
| `clsx` | MIT |
| `get-nonce` | MIT |
| `next` | MIT |
| `openapi-fetch` | MIT |
| `react` | MIT |
| `react-dom` | MIT |
| `react-remove-scroll` | MIT |
| `react-remove-scroll-bar` | MIT |
| `react-style-singleton` | MIT |
| `styled-jsx` | MIT |
| `tailwind-merge` | MIT |
| `tailwindcss` | MIT |
| `tslib` | 0BSD |
| `use-callback-ref` | MIT |
| `use-sidecar` | MIT |

Next.js builds other packages into its own `dist/compiled`. The ones the image
carries, and the license files Next.js ships with them, are under
`/usr/share/doc/vela/npm/next/<version>/compiled/`, listed in `packages.tsv` there.

## Fonts

| File | Font | License |
| --- | --- | --- |
| `public/fonts/broadcast-marks.woff2` | Noto Sans CJK JP 2.004, subset to the broadcast marks. Copyright © 2014-2021 Adobe | OFL-1.1 |

The license is at `/usr/share/doc/vela/fonts/broadcast-marks.woff2.txt`.

## The base image

`node:24.21-slim` also carries npm, Corepack and Yarn 1, each with its license
beside it (`/usr/local/lib/node_modules/npm/LICENSE`,
`/usr/local/lib/node_modules/corepack/LICENSE.md`, `/opt/yarn-v*/LICENSE`), and the
packages of Debian 12. The license of each Debian package is
`/usr/share/doc/<package>/copyright`, and Debian keeps the source of every version
at `https://snapshot.debian.org/package/<source package>/<version>/`, under the
name and version that `dpkg-query -W -f '${source:Package} ${source:Version}\n'`
reports in the image.
