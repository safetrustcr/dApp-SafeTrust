# @safetrust/mcp

SafeTrust's own MCP server: local developer tooling that lets an AI client
(Claude Code, Claude Desktop, Cursor, the MCP Inspector) read your local
SafeTrust stack and explain where a booking's escrow stands. Ask it *"why is
booking `hotel:<reservationId>` stuck?"* or *"can apartment `<uuid>` be escrowed
for guest `G…`?"* and it answers from the same tables and rules `apps/api` uses.

It never signs, submits or holds keys, and it never talks to Trustless Work:
every transaction is built by `apps/api` and signed by a person in their wallet.

> **Read [`docs/mcp/README.md`](../docs/mcp/README.md) first.** It states what this
> server is and is not (local stdio tooling, never a public API, never holds keys or
> submits transactions), how to connect Claude Code, Claude Desktop or the MCP
> Inspector, the safety of every tool, and what to do if an AI client is exposed to
> privileged data. It is also served as the resource
> `safetrust://docs/safetrust-mcp-trust-boundary`.

> **Read [`docs/mcp/README.md`](../docs/mcp/README.md) first.** It states what this
> server is and is not (local stdio tooling, never a public API, never holds keys or
> submits transactions), how to connect Claude Code, Claude Desktop or the MCP
> Inspector, the safety of every tool, and what to do if an AI client is exposed to
> privileged data. It is also served as the resource
> `safetrust://docs/safetrust-mcp-trust-boundary`.

## Setup

```bash
pnpm install
pnpm --filter @safetrust/mcp build
```

The root [`mcp.json`](../mcp.json) registers this server over stdio for editors
that read it (Cursor). Claude Code and Claude Desktop need their own entry — see
[client setup](../docs/mcp/README.md#3-set-it-up). Its `args` are repo-root
relative (`mcp/dist/index.js`), so build before the editor connects;
`pnpm --filter @safetrust/mcp dev` runs the TypeScript sources through `tsx`.
Restart the client after a rebuild — stdio servers start once per session.
The root [`mcp.json`](../mcp.json) registers this server over stdio alongside the
external TrustlessWork and Stellar Raven servers for editors that read it (Cursor).
Claude Code and Claude Desktop need their own entry — see
[client setup](../docs/mcp/README.md#3-set-it-up).
Its `args` are repo-root relative (`mcp/dist/index.js`), which means the build has to
run before the editor connects. During development, `pnpm --filter @safetrust/mcp dev`
runs the TypeScript sources directly through `tsx`.

## The flow these tools follow

Two booking kinds share one escrow model in `apps/api`:

| Booking | Engagement id | Terms come from |
|---|---|---|
| Apartment deposit | `rental:<apartmentId>:<guestFirebaseUid>` | `apartments.warranty_deposit` + the owner's primary wallet |
| Hotel reservation | `hotel:<reservationId>` | `reservations.total_amount` + the hotel owner's primary wallet |

1. **Build.** `POST /api/escrow/deploy` (`apartmentId` or `reservationId` + the
   guest's registered wallet), then `/fund`, `/milestone-status`,
   `/approve-milestone`, `/release-funds`, `/resolve-dispute`. Each checks that the
   caller's registered wallet holds the signing role and records the unsigned XDR
   in `escrow_pending_actions` under its hash (status `built`).
2. **Sign and submit.** The signer signs in their wallet in the browser; the
   frontend calls `POST /api/escrow/send-transaction`, which only accepts a signed
   XDR whose hash matches a row built for that user (status `submitted`).
3. **Transition.** Status changes follow `escrow_status_transitions`
   (pending_signature → created → funded → milestone_approved → completed, plus
   disputed/resolved/cancelled) and are logged, append-only, in
   `escrow_transactions`.
4. **Reconcile.** `POST /reconciliation/sync-escrows` (cron, secret header) asks
   Horizon about submitted transactions and applies the ones that landed.

## Tools

| Tool | What it answers | Reads |
|---|---|---|
| `get-booking-context` | Property, dates, amount + asset, host/guest wallets (shortened), existing escrows, and anything that would make `apps/api` refuse to deploy | Hasura |
| `get-wallet-readiness` | Can this booking be escrowed? The checks the app shows the guest — registered wallet, account, XLM for fees, USDC trustline and balance, host and platform can receive — each failing check with its fix | `apps/api` `GET /api/escrow/readiness`; fallback Hasura + Testnet Horizon |
| `diagnose-escrow` | Plain-language status and next step: built-not-signed, expired, submitted-not-confirmed, lost, confirmed-but-DB-behind (reconciler), failed, synced | Hasura, Testnet Horizon |
| `get-escrow-status` | The escrow row, its last 10 transitions and the Trustless Work mirror status | Hasura |
| `get-pending-action` | Built transactions for an escrow: action, status, tx hash, signer, expiry — never the XDR | Hasura |
| `deploy-escrow` | Builds the unsigned deploy transaction (`POST /api/escrow/deploy`) | `apps/api` |
| `fund-escrow` | Builds the unsigned fund transaction (`POST /api/escrow/fund`) | `apps/api` |
| `orchestrate-escrow` | Stateless step-by-step guide through the lifecycle | — |
| `explain-escrow-roles` | Which wallet fills each Trustless Work role and which role signs each action | — |
| `check-stack-health` | Are `apps/api` and Hasura up? | `apps/api`, Hasura |
| `get-apartment`, `list-apartments` | Listings and owner wallets | Hasura |
| `query-escrows`, `query-trustless-work-escrows`, `query-user-wallets` | Filtered table reads | Hasura |
| `hasura-query` | Escape hatch: any read-only GraphQL query | Hasura |

**Output rules.**

- Only `deploy-escrow` and `fund-escrow` return an unsigned XDR, and only a short
  preview of it. Every other tool withholds XDRs, even if a query selects one.
- Booking tools shorten wallet addresses (`GABC…WXYZ`).

**Build tools need a signed-in user.** The `apps/api` build routes require a
Firebase user and an `Idempotency-Key`, and the MCP does not sign in as the Testnet
test user yet ([#528](https://github.com/safetrustcr/dApp-SafeTrust/issues/528)).
Until then they return `401`; build through the app and use the read tools to
follow along.

**Readiness comes from `apps/api`.** `get-wallet-readiness` calls
`GET /api/escrow/readiness`, so it reports exactly what the app's readiness
checklist shows, and explains each fix code (`LINK_WALLET`, `FUND_XLM`,
`ADD_TRUSTLINE`, `GET_TEST_USDC`). That route needs a signed-in user, so until
[#528](https://github.com/safetrustcr/dApp-SafeTrust/issues/528) lands — or when
`apps/api` is not running — the tool falls back to its own read-only Hasura and
Testnet Horizon checks and labels its answer as such. A real refusal from
`apps/api` (for example `SELF_ESCROW_NOT_ALLOWED`) is shown as is.

**Reads use the admin secret today.**
[#530](https://github.com/safetrustcr/dApp-SafeTrust/issues/530) moves them to
allow-listed queries under a least-privilege `mcp_reader` role.

### Trying `diagnose-escrow` locally

[`tests/fixtures/diagnose-cases.sql`](tests/fixtures/diagnose-cases.sql) seeds
three escrows into a local database: built-but-unsigned, submitted-not-confirmed
and confirmed-and-synced. The file header has the `psql` command.

## Resources

| URI | Contents |
|---|---|
| `safetrust://docs/architecture` | Escrow lifecycle, monorepo layout, tables and role mappings — generated at read time |
| `safetrust://docs/safetrust-readme` | Root `README.md` |
| `safetrust://docs/safetrust-mcp-readme` | This file |
| `safetrust://docs/safetrust-mcp-trust-boundary` | `docs/mcp/README.md` — trust boundary, client setup, tool safety, incident response |
| `safetrust://docs/safetrust-api-env-example` | `apps/api/.env.example` |
| `safetrust://docs/safetrust-frontend-readme` | `apps/frontend/README.md`, when it exists |

File-backed resources are read on each request; missing files are skipped.

## Environment

Read from the MCP client's `env` block — the server does not load a `.env` file.
`HASURA_ADMIN_SECRET` has no default and must be set for every Hasura tool. The
full list, with what each variable grants, is in
[`docs/mcp/README.md`](../docs/mcp/README.md#configuration), generated from
[`.env.example`](.env.example).

| Variable | Default | Used by |
|---|---|---|
| `HASURA_GRAPHQL_URL` | `http://localhost:8080/v1/graphql` | every Hasura read |
| `HASURA_ADMIN_SECRET` | none — required (local stack: `myadminsecretkey`) | every Hasura read |
| `SAFETRUST_API_URL` | `http://localhost:3002` | `deploy-escrow`, `fund-escrow`, `check-stack-health` |
| `STELLAR_HORIZON_URL` | `https://horizon-testnet.stellar.org` | `get-wallet-readiness`, `diagnose-escrow`; refused unless Testnet or localhost |
| `USDC_TRUSTLINE_ADDRESS` | Testnet USDC issuer (`NEXT_PUBLIC_USDC_ADDRESS` also accepted) | trustline and balance checks; same variable `apps/api` deploys with |
| `PLATFORM_STELLAR_ADDRESS` | unset | shown by `explain-escrow-roles` |
| `SAFETRUST_REPO_ROOT` | auto-detected | docs resources |
| `HASURA_GRAPHQL_URL` | `http://localhost:8080/v1/graphql` | every Hasura tool |
| `HASURA_ADMIN_SECRET` | none — required (local stack: `myadminsecretkey`) | every Hasura tool |
| `SAFETRUST_API_URL` | `http://localhost:3002` | `deploy-escrow`, `fund-escrow` |
| `PLATFORM_STELLAR_ADDRESS` | unset | shown by `explain-escrow-roles` (`NEXT_PUBLIC_PLATFORM_ADDRESS` also accepted) |
| `NEXT_PUBLIC_USDC_ADDRESS` | testnet USDC issuer | shown by `explain-escrow-roles` |
| `SAFETRUST_REPO_ROOT` | auto-detected | overrides repo-root detection for the docs resources |

Hasura reads use the admin secret and bypass row permissions: treat output as
privileged and never point the server at a non-local Hasura.

## Tests

```bash
pnpm --filter @safetrust/mcp test:escrow     # tools against a stubbed local stack
pnpm --filter @safetrust/mcp test:boundary   # docs/mcp/README.md matches the server
pnpm --filter @safetrust/api exec vitest run tests/mcp-contract.test.ts
```

- **`tests/escrow-tools.test.ts`** runs the tools with Hasura, `apps/api` and
  Horizon answered from fixtures. It fails if:
  - any tool other than the build tools prints an XDR;
  - any MCP module imports a Trustless Work client or calls its URL.
- **`apps/api/tests/mcp-contract.test.ts`** runs the real `apps/api` routers and
  handlers against [`src/lib/api-contract.ts`](src/lib/api-contract.ts) and
  [`src/lib/escrow-roles.ts`](src/lib/escrow-roles.ts). It fails when:
  - a route's path, mount or response fields change;
  - a role assignment or signing role drifts.

## Prerequisites

- Hasura + PostgreSQL (`cd infra/backend && bin/start safetrust hotel_industry`)
  for every read tool.
- `apps/api` (`pnpm --filter @safetrust/api dev`) for the build tools.
- Network access to Testnet Horizon for `get-wallet-readiness` and the on-chain
  part of `diagnose-escrow`.
