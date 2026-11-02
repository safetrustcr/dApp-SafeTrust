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
| `deploy-escrow` | Builds the unsigned deploy transaction (`POST /api/escrow/deploy`) as the local test user; opt-in | `apps/api` |
| `fund-escrow` | Builds the unsigned fund transaction (`POST /api/escrow/fund`) as the local test user; opt-in | `apps/api` |
| `orchestrate-escrow` | Stateless step-by-step guide through the lifecycle | — |
| `explain-escrow-roles` | Which wallet fills each Trustless Work role and which role signs each action | — |
| `check-stack-health` | Are `apps/api` and Hasura up? | `apps/api`, Hasura |
| `get-apartment`, `list-apartments` | Listings and owner wallets | Hasura |
| `query-escrows`, `query-trustless-work-escrows`, `query-user-wallets` | Filtered table reads | Hasura |
| `hasura-query` | Escape hatch: read-only GraphQL under the `mcp_reader` role; registered only when `SAFETRUST_MCP_ENABLE_RAW_HASURA=true` | Hasura |

**Output rules.**

- Only `deploy-escrow` and `fund-escrow` return an unsigned XDR. Every other tool
  withholds XDRs, even if a query selects one.
- Stellar addresses are shortened (`GABC…WXYZ`) unless
  `SAFETRUST_MCP_SHOW_FULL_IDS=true`; emails and phone numbers are masked.
- Each tool invocation writes a data-free audit line to stderr.

**Build tools are opt-in.** `deploy-escrow` and `fund-escrow` make no request
unless `SAFETRUST_MCP_ALLOW_MUTATIONS=true`. When enabled, they verify
`GET /health` reports `stellarNetwork=TESTNET`, sign in once as the configured
Firebase test user, and refresh the cached ID token five minutes before expiry.
Each call sends the bearer token and a UUID `Idempotency-Key`; the key is returned
in the tool response for safe retries.

**Readiness comes from `apps/api`.** `get-wallet-readiness` calls
`GET /api/escrow/readiness`, so it reports exactly what the app's readiness
checklist shows, and explains each fix code (`LINK_WALLET`, `FUND_XLM`,
`ADD_TRUSTLINE`, `GET_TEST_USDC`). That route needs a signed-in user, so when it
answers `401` — or when `apps/api` is not running — the tool falls back to its own
read-only Hasura and Testnet Horizon checks and labels its answer as such. A real
refusal from `apps/api` (for example `SELF_ESCROW_NOT_ALLOWED`) is shown as is.

**Reads run as `mcp_reader`.** All Hasura reads authenticate locally with the
admin secret and explicitly assume the `mcp_reader` role. Hasura enforces that
role's select-only table and column permissions; messages, conversations, push
devices and idempotency keys are not readable. Query depth and node limits are
also enforced by Hasura, and each named list tool caps results at 100 rows.

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

## Configuration

Values come from the MCP client's `env` block or from the gitignored `mcp/.env`
(copy [`.env.example`](.env.example)); the environment wins. Configuration fails
closed: `HASURA_GRAPHQL_URL`, `HASURA_ADMIN_SECRET` and `SAFETRUST_API_URL` have no
defaults, and non-local hosts are refused unless `SAFETRUST_MCP_ALLOW_REMOTE=true`.
Never put the test password in `mcp.json`, tool arguments, or source control.

The full list, with what each variable grants, is in
[`docs/mcp/README.md`](../docs/mcp/README.md#configuration), generated from
[`.env.example`](.env.example).

## Tests

| Suite | Command | Needs | Runs |
|---|---|---|---|
| Unit | `pnpm --filter @safetrust/mcp test` | nothing — every `fetch` is stubbed | every PR |
| Contract | `pnpm --filter @safetrust/mcp test:contract` | nothing — apps/api is mounted in-process, Hasura and Firebase are mocked | PRs touching `mcp/**` or `apps/api/src/routes/**` |
| Escrow tools | `pnpm --filter @safetrust/mcp test:escrow` | nothing — Hasura, `apps/api` and Horizon answered from fixtures | every PR |
| Trust boundary | `pnpm --filter @safetrust/mcp test:boundary` | nothing | every PR |
| Smoke | `MCP_TESTNET_SMOKE=true pnpm --filter @safetrust/mcp test:smoke` | local stack (`bin/start` + apps/api) with seeded data | manual / nightly |

- `tests/unit/` drives the real MCP protocol over an in-memory transport and asserts
  outbound requests: the `Authorization` header, the admin secret being required (no
  fallback), which filters reach Hasura, and that `hasura-query` stays off by default.
- `tests/contract/` starts `createApp()` from `apps/api/src/app.ts` on an ephemeral
  port and asserts the exact status codes and response bodies the MCP tools depend on.
- `tests/escrow-tools.test.ts` fails if any tool other than the build tools prints an
  XDR, or if any MCP module imports a Trustless Work client or calls its URL.
- `tests/trust-boundary.test.ts` checks `docs/mcp/README.md` against the server's
  `tools/list`.
- `apps/api/tests/mcp-contract.test.ts` runs the real `apps/api` routers and handlers
  against [`src/lib/api-contract.ts`](src/lib/api-contract.ts) and
  [`src/lib/escrow-roles.ts`](src/lib/escrow-roles.ts).
- `tests/smoke/` is skipped unless `MCP_TESTNET_SMOKE=true` and only calls read-only
  tools — it asserts that no transaction is ever built.

## Prerequisites

- Hasura + PostgreSQL (`cd infra/backend && bin/start safetrust hotel_industry`)
  for every read tool.
- `apps/api` (`pnpm --filter @safetrust/api dev`) for the build tools.
- Network access to Testnet Horizon for `get-wallet-readiness` and the on-chain
  part of `diagnose-escrow`.
