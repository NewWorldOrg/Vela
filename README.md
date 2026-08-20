# Vela

Web frontend for a self-hosted TV recording system.

Vela renders the programme guide, reservations and the recording library in the
browser. Recording itself is done by a separate backend, which Vela reaches through
a client generated from its OpenAPI document.

## Requirements

- Docker
- A running backend to point `CARINA_API_BASE_URL` at

## Getting started

```bash
task up
task dev          # http://localhost:8080
task storybook    # http://localhost:6006
```

Without Task:

```bash
docker compose up -d
docker compose exec app yarn install
docker compose exec app yarn dev
```

## Configuration

| Variable | Description |
| --- | --- |
| `CARINA_API_BASE_URL` | Backend base URL. Required; there is no default |
| `DEV_ALLOWED_ORIGINS` | Host names the dev server accepts besides `localhost` |

The dev server refuses its chunks and the HMR socket for any host name not listed
in `DEV_ALLOWED_ORIGINS`.

## API client

`repository/client/` holds the OpenAPI document and the client generated from it.
Both are committed.

```bash
docker compose exec app yarn codegen:fetch    # refetch and regenerate
docker compose exec app yarn codegen:verify   # fail on a diff
```

Importing the generated client from outside `repository/` is blocked by eslint.

## Development

```bash
task lint
task typecheck
task test:stories    # renders every story in a real browser, fails on a11y violations
```

Conventions and the design system are documented in `CLAUDE.md`.
