# The consumed HTTP contract

`Carina.Api.json` is a copy of the OpenAPI document published by the API repository,
taken at the commit recorded in `carina-ref.txt`. `repository/client/schema.ts` is
generated from that copy and committed next to it.

## Why a copy and not a fetch

The document is a checked-in artifact of a separate, private repository. A path
reference works only on a machine that has both checkouts, and fetching it during a
build would make this repository's CI depend on a credential for a repository that is
not this one — a red build here for a reason that is not here. A copy at a pinned
commit needs nothing to build, and every change to the contract arrives as a
reviewable diff.

## Updating

```bash
yarn openapi:sync                              # on the host: needs the other checkout and git
CARINA_CHECKOUT=/path/to/api yarn openapi:sync # the default is ../Carina
docker compose exec app yarn openapi:generate  # regenerate the types from the copy
```

The sync copies the document out of a checkout and records that checkout's commit. It
runs on the host because the container has neither the other checkout nor git. It
refuses to run while the document is modified in that checkout, so the recorded commit
always describes the bytes that were copied.

## Staleness

Nothing here notices that the contract moved — the sync is a deliberate act. That is
survivable because the contract is additive only: a stale copy means this repository
does not know an endpoint yet, never that it calls one that is gone. A field added to
a response is invisible until the sync; a field this repository already reads cannot
be taken away without breaking that rule upstream.

What CI does check is that the committed types match the committed document:
`yarn openapi:verify` regenerates the client from `Carina.Api.json` and fails on any
difference, so a hand-edited or half-regenerated client cannot reach master.

## The boundary

Generated types stay in `repository/client`. Everything above `repository/` receives
this repository's own types from a function in `repository/`, exactly as it receives
them from the fixtures. `no-restricted-imports` fails the lint when anything outside
`repository/` imports the generated client, or `openapi-fetch` directly.

## What the document does not describe

Three surfaces do not fit a request/response schema — the transport stream, the event
hub and the bulk programme guide. They are declared in the API repository, not here.
Every path other than `/api/health` answers `401` until authentication exists, and the
document declares no security scheme, so the generated client carries no auth wiring.

## Checking a live API

```bash
CARINA_API_BASE_URL=http://<host>:<port> npx tsx scripts/health-check.ts
```

Prints the `/api/health` payload as `repository/` hands it up, or the error.
`CARINA_API_BASE_URL` has no default: an unset base URL fails instead of quietly
addressing the wrong process.
