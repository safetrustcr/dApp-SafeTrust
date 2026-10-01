# SafeTrust — System architecture overview

This document describes the SafeTrust system architecture (consolidation-pattern branch). It is the entry point for developers and reviewers who need to understand service boundaries, ports, and the Compute Resource Consolidation pattern used in this milestone. All facts below are sourced from the repository files referenced inline.

## Quick summary

- Purpose: decentralized P2P escrow for rentals using Stellar (TrustlessWork API).
- Key runtime pieces: frontend (Next.js), API (Express), Hasura GraphQL, PostgreSQL, and the SafeTrust MCP server.

## Monorepo layout

- **apps/** — application code
  - [apps/api](apps/api): Express HTTP API (write authority for escrow and auth). See [apps/api/src/index.ts](apps/api/src/index.ts) and the `routes/escrow` folder in [apps/api/src/routes](apps/api/src/routes/) for escrow-related endpoints.
  - [apps/frontend](apps/frontend): Next.js 14 UI, reads via Apollo and is configured to run on port 3001 (see [apps/frontend/package.json](apps/frontend/package.json)). The frontend's escrow write routes were migrated — see [apps/frontend/src/app/api/escrow/README.md](apps/frontend/src/app/api/escrow/README.md).

- **infra/backend** — Hasura + infra glue
  - [infra/backend/docker-compose.yml](infra/backend/docker-compose.yml) defines Docker services: Postgres, Hasura (graphql-engine), and the API container (built from `apps/api`).
  - [infra/backend/bin/start](infra/backend/bin/start) contains orchestration steps (start containers, wait for Hasura, register DB sources, apply migrations, deploy metadata, apply seeds).

- **mcp/** — SafeTrust MCP server
  - [mcp/src/index.ts](mcp/src/index.ts) starts the MCP server over stdio and registers escrow/apartment/hasura tools. Run with `pnpm --filter @safetrust/mcp dev` (script `tsx src/index.ts` in [mcp/package.json](mcp/package.json)).

- **packages/** — shared packages
  - [packages/graphql](packages/graphql): generated GraphQL types and client stubs.
  - [packages/types](packages/types): shared TypeScript types.

- **services/** — *(empty)*

  The legacy webhook service that lived here was retired under the Compute
  Resource Consolidation pattern. See [Retired services](#retired-services) below.

## Compute Resource Consolidation pattern (what changed)

The repository contains an explicit migration note: "All escrow write routes have been moved to apps/api/src/routes/escrow/ as part of the Compute Resource Consolidation pattern" ([apps/frontend/src/app/api/escrow/README.md](apps/frontend/src/app/api/escrow/README.md)).

Concretely (before / after):

- Before: the frontend contained write routes that directly executed escrow writes (and required direct access to TrustlessWork secrets/keys).
- After (consolidation-pattern): those write routes were migrated into a single write authority: `apps/api` (Express). The frontend became a pure UI/read layer (reads via Apollo → Hasura; writes via fetch() → `http://localhost:3002/api/escrow/*`). See the migration README above.

Why this pattern (as implemented here):

- Centralizes write operations and secret handling into a single back-end process (`apps/api`).
- Simplifies CORS, tenancy and rate-limiting rules by funneling writes through one service boundary.
- Allows the UI to remain a read-only consumer of Hasura GraphQL (Apollo) while delegating sensitive operations and integrations (TrustlessWork interactions, XDR signing workflows) to a trusted server-side component.

## Architecture diagram

```mermaid
flowchart TB
  subgraph Stellar
    direction TB
    ST["Stellar Blockchain\n(TrustlessWork API)"]
  end

  ST <--> |signed XDR| API["apps/api\n(Express — write authority)\nport: 3002"]
  API <--> |GraphQL mutations| HAS["infra/backend\n(Hasura GraphQL)\nport: 8080"]
  HAS <--> |GraphQL queries| FE["apps/frontend\n(Next.js, Apollo)\nport: 3001"]
  MCP["mcp/ — MCP server (stdio)"] -->|AI tools / stdio| API
  note right of MCP: MCP runs over stdio; it is not an HTTP service

  subgraph Docker
    PG["PostgreSQL\nport: 5433 (host) -> 5432 (container)"]
    HAS
  end

  HAS <---> PG
  HAS --> |"actions + event triggers (WEBHOOK_URL)"| API
```

## Port assignments (observed in repository)

- Frontend Next.js: 3001 (see [apps/frontend/package.json](apps/frontend/package.json)).
- API (Express): 3002 (default in [apps/api/src/index.ts](apps/api/src/index.ts)).
- Hasura GraphQL engine: 8080 (see [infra/backend/docker-compose.yml](infra/backend/docker-compose.yml) and [infra/backend/bin/start](infra/backend/bin/start)).
- PostgreSQL (host mapping): 5433 (maps to container 5432 in [infra/backend/docker-compose.yml](infra/backend/docker-compose.yml)).
- API (Express) container: 3002 (built from [apps/api](apps/api) as the `api` service, `safetrust-api`, in docker-compose).

## What runs where

- Docker (via `infra/backend/docker-compose.yml`):
  - `postgres` (PostGIS image) — persistent volume `db_data` — host port 5433.
  - `graphql-engine` (Hasura) — host port 8080.
  - `api` (safetrust-api) — host port 3002; built from `apps/api` (the Dockerized form of the same Express app run by `pnpm dev`).

- Local/dev (pnpm / tsx):
  - `apps/frontend` — Next dev (`next dev --port 3001`) — UI and Apollo reader.
  - `apps/api` — Express API (`tsx watch src/index.ts` in dev) — write authority for escrow/auth (port 3002).
  - `mcp/` — MCP server (`tsx src/index.ts`) — runs on stdio and registers tools for AI-assisted workflows.

## Important files (quick links)

- [apps/api/src/index.ts](apps/api/src/index.ts) — Express entrypoint (port 3002, registered routes).
- [apps/frontend/src/app/api/escrow/README.md](apps/frontend/src/app/api/escrow/README.md) — migration note for consolidation-pattern.
- [infra/backend/docker-compose.yml](infra/backend/docker-compose.yml) — Docker services and port mappings.
- [infra/backend/bin/start](infra/backend/bin/start) — orchestration script: starts compose, waits for Hasura, registers sources, applies migrations/metadata/seeds.
- [mcp/src/index.ts](mcp/src/index.ts) — MCP server entrypoint (stdio).

## How to run locally (developer notes)

1. Start infra (Hasura + Postgres):

```bash
cd infra/backend
./bin/start safetrust
```

2. Run frontend, API and MCP in development mode (each in its package folder):

```bash
pnpm --filter @safetrust/web dev
pnpm --filter @safetrust/api dev
pnpm --filter @safetrust/mcp dev
```

Notes:

- The frontend reads from Hasura (Apollo) and performs writes by calling `http://localhost:3002/api/escrow/*` after consolidation.
- The `infra/backend/bin/start` script reports service URLs after startup and expects Hasura to be reachable at `http://localhost:8080`.

## Retired services

The legacy webhook service (`services/webhook`) was retired under the Compute
Resource Consolidation pattern. Its responsibilities now live in `apps/api`.
Do not reuse or restore its code — recover it from Git history only if needed,
e.g. `git show <sha>:services/webhook/_archived/src/server.js`.

| Old responsibility | Now lives in | Issue |
|---|---|---|
| Docker Compose service | `apps/api` service (`safetrust-api:3002`) | #342 |
| Idempotency + tenant middleware | `apps/api` | #343 |
| `sync-wallet`, `require-role` | `apps/api` | #344 |
| `sync-user` (Firebase Admin verification) | `apps/api` | #359 |
| `activate-wallet` | `apps/api` | #360 |

Last commit that touched the service before its deletion:

```
dbbaf1bdffac9aed4e182ac5132f1968e96c3aca — docs: add LOCAL_DEVELOPMENT.md for contributor onboarding (#807) (#461)
```

## Prerequisite

- This document assumes the docs skeleton issue has been merged into the branch.

---

If you want any additional details (sequence diagrams for the escrow XDR signing flow, a deployment diagram for production, or a shorter one-page cheat-sheet), tell me which one to add next.
