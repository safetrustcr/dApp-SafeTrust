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
| `check-stack-health` | Ping apps/api, Hasura, and TrustlessWork testnet and report their status | apps/api, Hasura, TrustlessWork |
| `deploy-escrow` | Builds a Testnet escrow via authenticated `apps/api` `POST /api/escrow/deploy`, returns unsigned XDR and pending-action id | `apps/api`, local test user |
| `fund-escrow` | Builds a Testnet funding transaction via authenticated `POST /api/escrow/fund` | `apps/api`, local test user |
| `orchestrate-escrow` | Stateless step-by-step guide through the whole deploy → sign → fund → release lifecycle | — |
| `get-escrow-status` | Looks up `public.escrows` by `contractId` or `engagementId` | Hasura |
| `explain-escrow-roles` | SafeTrust ↔ TrustlessWork role mapping reference | — |
| `get-apartment` | Apartment details plus the owner's Stellar wallet | Hasura |
| `list-apartments` | Search listings by name, price and availability | Hasura |
| `query-escrows` | Filter safe `public.escrows` fields by status, contract or engagement id | Hasura |
| `query-trustless-work-escrows` | Filter safe `public.trustless_work_escrows` fields | Hasura |
| `query-user-wallets` | Resolve wallets by user id or address | Hasura |
| `hasura-query` | Optional escape hatch: read-only GraphQL under the restricted `mcp_reader` role | Hasura; opt-in flag |

`deploy-escrow` and `fund-escrow` never sign or submit anything — they return the
unsigned XDR that a wallet (Freighter) has to sign, exactly like the HTTP routes do.

## Orchestrating the lifecycle

`orchestrate-escrow` walks a contributor through the full lifecycle without
holding any state server-side. Call it with `step="start"` and the booking
details, then feed each response's `engagementId`/`contractId` back into the
next call to resume:

| Step | What it tells you to do |
|---|---|
| `start` | Call `deploy-escrow` with the apartment id and the test user's registered wallet |
| `after-deploy` | Sign the returned XDR in Freighter, then call `fund-escrow` with the returned `engagementId` |
| `after-fund` | Lifecycle note — `milestone-status` by the host, then `release-funds` by the tenant |
| `status` | Call `get-escrow-status` with `contractId` or `engagementId` |

Every step routes only through `apps/api` (`POST /api/escrow/…`) or the other
MCP tools. `orchestrate-escrow` never calls TrustlessWork directly and no XDR is
ever signed server-side — Freighter signing stays in the browser.

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
development. All of them have defaults that match `bin/start`.

Escrow mutations additionally require a local Testnet Firebase test-user
configuration. Copy `mcp/.env.example` to the gitignored `mcp/.env`; never put the
test password in `mcp.json`, tool arguments, or source control.

| Variable | Default | Used by |
|---|---|---|
| `HASURA_GRAPHQL_URL` | `http://localhost:8080/v1/graphql` | every Hasura tool |
| `HASURA_ADMIN_SECRET` | `myadminsecretkey` | every Hasura tool (`HASURA_GRAPHQL_ADMIN_SECRET` also accepted) |
| `SAFETRUST_API_URL` | `http://localhost:3002` | `deploy-escrow`, `fund-escrow` |
| `SAFETRUST_MCP_ENABLE_RAW_HASURA` | unset (off) | registers `hasura-query` when set to `true` |
| `PLATFORM_STELLAR_ADDRESS` | unset | shown by `explain-escrow-roles` (`NEXT_PUBLIC_PLATFORM_ADDRESS` also accepted) |
| `NEXT_PUBLIC_USDC_ADDRESS` | testnet USDC issuer | shown by `explain-escrow-roles` |
| `SAFETRUST_REPO_ROOT` | auto-detected | overrides repo-root detection for the docs resources |
| `SAFETRUST_MCP_FIREBASE_API_KEY` | unset | Firebase web API key used for local test-user sign-in |
| `SAFETRUST_MCP_TEST_EMAIL` | unset | email of the local Firebase Testnet test user |
| `SAFETRUST_MCP_TEST_PASSWORD` | unset | password of the local Firebase Testnet test user |
| `SAFETRUST_MCP_ALLOW_MUTATIONS` | `false` | explicitly enables `deploy-escrow` and `fund-escrow` |

All MCP Hasura reads authenticate locally with the admin secret and explicitly assume
the `mcp_reader` role. Hasura enforces that role's select-only table and column
permissions; messages, conversations, push devices and idempotency keys are not
readable. `hasura-query` is not registered unless
`SAFETRUST_MCP_ENABLE_RAW_HASURA` is set to `true`. Query depth and node limits
are also enforced by Hasura, and each named list tool caps results at 100 rows.
Each MCP tool invocation writes a data-free audit line to stderr.

Mutation tools are disabled by default and make no API request until explicitly
enabled. When enabled, they verify `GET /health` reports `stellarNetwork=TESTNET`,
sign in once as the configured Firebase test user, and refresh the cached ID token
five minutes before expiry. Each protected API call sends the bearer token and a
UUID `Idempotency-Key`; the key is returned in the tool response for safe retries.
The API returns only the unsigned XDR and pending-action identifier needed by the
wallet flow. The MCP server never signs or submits transactions.

## Tests

Three suites, all run from the repo root or with `--filter @safetrust/mcp`:

| Suite | Command | Needs | Runs |
|---|---|---|---|
| Unit | `pnpm --filter @safetrust/mcp test` | nothing — every `fetch` is stubbed | every PR |
| Contract | `pnpm --filter @safetrust/mcp test:contract` | nothing — apps/api is mounted in-process, Hasura and Firebase are mocked | PRs touching `mcp/**` or `apps/api/src/routes/**` |
| Smoke | `MCP_TESTNET_SMOKE=true pnpm --filter @safetrust/mcp test:smoke` | local stack (`bin/start` + apps/api) with seeded data | manual / nightly |

- `tests/unit/` drives the real MCP protocol over an in-memory transport and asserts
  outbound requests: the `Authorization` header, the admin secret being required (no
  fallback), which filters reach Hasura, and that `hasura-query` stays off by default.
- `tests/contract/` starts `createApp()` from `apps/api/src/app.ts` on an ephemeral
  port and asserts the exact status codes and response bodies the MCP tools depend on
  (`/health`, the `401`/`400` envelopes, RFC 7807 problem details, idempotent replay).
- `tests/smoke/` is skipped unless `MCP_TESTNET_SMOKE=true` and only calls read-only
  tools — it asserts that no transaction is ever built.

The suites use Node's built-in `fetch` through a recording stub, so they need no
network and no Firebase/Hasura credentials.

## Prerequisites

- Hasura + PostgreSQL running (`infra/backend/bin/start`) for every read tool.
- `apps/api` running (`pnpm --filter @safetrust/api dev`) for `deploy-escrow` and
  `fund-escrow`. Both surface a clear "cannot reach" message when it is down.

## Known divergence

`apps/api` and `apps/frontend` build different TrustlessWork payloads for the same
deploy step — `releaseSigner` is the tenant in `apps/api` and the platform wallet in
the frontend, and only the frontend sends a USDC trustline block. `deploy-escrow`
calls `apps/api`, so it inherits that behaviour; `explain-escrow-roles` spells the
difference out. Worth resolving before either path is treated as canonical.
