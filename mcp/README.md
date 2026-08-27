# @safetrust/mcp

SafeTrust's own MCP server. It exposes escrow operations, live Hasura queries and
SafeTrust architecture context to AI editors (Cursor, Claude Code), so a contributor
can ask *"what is the owner wallet for apartment `<uuid>`?"* or *"deploy an escrow for
apartment `<uuid>`, tenant `G…`, owner `G…`, 1200 USDC"* and get answers wired to this
repo's real routes, tables and role mappings — not generic TrustlessWork advice.

## Setup

```bash
pnpm install
pnpm --filter @safetrust/mcp build
```

The root [`mcp.json`](../mcp.json) registers this server over stdio alongside the
external TrustlessWork and Stellar Raven servers, so editors pick it up automatically.
Its `args` are repo-root relative (`mcp/dist/index.js`), which means the build has to
run before the editor connects. During development, `pnpm --filter @safetrust/mcp dev`
runs the TypeScript sources directly through `tsx`.

Restart the MCP client after a rebuild — stdio servers are started once per session.

## Available tools

| Tool | What it does | Needs |
|---|---|---|
| `deploy-escrow` | Deploys a single-release escrow via `apps/api` `POST /api/escrow/deploy`, returns the unsigned XDR | `apps/api` |
| `fund-escrow` | Builds the funding transaction via `POST /api/escrow/fund` | `apps/api` |
| `get-escrow-status` | Looks up `public.escrows` by `contractId` or `engagementId` | Hasura |
| `explain-escrow-roles` | SafeTrust ↔ TrustlessWork role mapping reference | — |
| `get-apartment` | Apartment details plus the owner's Stellar wallet | Hasura |
| `list-apartments` | Search listings by name, price and availability | Hasura |
| `query-escrows` | Filter `public.escrows` by status, apartment or wallet | Hasura |
| `query-trustless-work-escrows` | Filter `public.trustless_work_escrows` (`marker`/`approver`/`releaser`/`resolver`) | Hasura |
| `query-user-wallets` | Resolve wallets by user id, email or address | Hasura |
| `hasura-query` | Escape hatch: any read-only GraphQL query. Mutations and subscriptions are refused | Hasura |

`deploy-escrow` and `fund-escrow` never sign or submit anything — they return the
unsigned XDR that a wallet (Freighter) has to sign, exactly like the HTTP routes do.

## Available resources

| URI | Contents |
|---|---|
| `safetrust://docs/architecture` | Escrow lifecycle, monorepo layout, Hasura tables, role mappings — generated at read time |
| `safetrust://docs/safetrust-readme` | Root `README.md` |
| `safetrust://docs/safetrust-mcp-readme` | This file |
| `safetrust://docs/safetrust-api-env-example` | `apps/api/.env.example` |
| `safetrust://docs/safetrust-frontend-readme` | `apps/frontend/README.md`, when it exists |

File-backed resources are read on each request, so edits show up without a restart.
Missing files are skipped rather than failing startup.

## Environment

Read from the `env` block in the root `mcp.json` — no `.env` file is needed for local
development. All of them have defaults that match `dc_prep`.

| Variable | Default | Used by |
|---|---|---|
| `HASURA_GRAPHQL_URL` | `http://localhost:8080/v1/graphql` | every Hasura tool |
| `HASURA_ADMIN_SECRET` | `myadminsecretkey` | every Hasura tool (`HASURA_GRAPHQL_ADMIN_SECRET` also accepted) |
| `SAFETRUST_API_URL` | `http://localhost:3002` | `deploy-escrow`, `fund-escrow` |
| `PLATFORM_STELLAR_ADDRESS` | unset | shown by `explain-escrow-roles` (`NEXT_PUBLIC_PLATFORM_ADDRESS` also accepted) |
| `NEXT_PUBLIC_USDC_ADDRESS` | testnet USDC issuer | shown by `explain-escrow-roles` |
| `SAFETRUST_REPO_ROOT` | auto-detected | overrides repo-root detection for the docs resources |

Queries run with the Hasura **admin secret**, bypassing row-level permissions — this is
a local developer tool, so treat its output as privileged and do not point it at a
production Hasura instance.

## Prerequisites

- Hasura + PostgreSQL running (`infra/hasura/bin/dc_prep`) for
  Hasura-backed tools (`get-apartment`, `list-apartments`, `get-escrow-status`).
  `explain-escrow-roles` works offline — no Hasura required.
- `apps/api` running (`pnpm --filter @safetrust/api dev`) for
  `deploy-escrow` and `fund-escrow`.

## Known divergence

`apps/api` and `apps/frontend` build different TrustlessWork payloads for the same
deploy step — `releaseSigner` is the tenant in `apps/api` and the platform wallet in
the frontend, and only the frontend sends a USDC trustline block. `deploy-escrow`
calls `apps/api`, so it inherits that behaviour; `explain-escrow-roles` spells the
difference out. Worth resolving before either path is treated as canonical.
