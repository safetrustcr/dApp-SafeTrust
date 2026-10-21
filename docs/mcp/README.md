# SafeTrust MCP server: trust boundary and contributor runbook

The SafeTrust MCP server (`mcp/`, package `@safetrust/mcp`) is **local developer
tooling**. It lets an AI client — Claude Code, Claude Desktop or the MCP
Inspector — read your local SafeTrust stack and build unsigned Testnet escrow
transactions while you work on the code. It runs as a child process of that
client, over **stdio**, on your machine.

It is **not**:

- a public API, or an API of any kind other people call;
- a runtime dependency of the app — `apps/frontend` and `apps/api` never call it;
- part of the guest's booking or payment path;
- something that holds or uses wallet keys.

This page is also served by the server itself as the MCP resource
`safetrust://docs/safetrust-mcp-trust-boundary`, so a client can read it in-chat.
`mcp/tests/trust-boundary.test.ts` checks the statements marked _(tested)_ below
against the code on every pull request.

## 1. Trust boundary

```
AI client (stdio) → SafeTrust MCP (local) ─┬─ reads → Hasura (local)
                                            └─ build-only → apps/api (local, Testnet)
Wallet signing, submitting and payments: browser + wallet only, never the MCP
```

- **Transport.** stdio only. The MCP architecture overview describes stdio as the
  transport for a local server with a single client, and says servers reached over
  HTTP need full authorization. SafeTrust stays on stdio, so there is no listening
  port and no authorization layer to get wrong. _(tested: `src/` imports only
  `StdioServerTransport`)_
- **Reads.** Hasura on your machine. Today every Hasura read uses the **admin
  secret** — row permissions are bypassed and every table is readable. With
  [#530](https://github.com/safetrustcr/dApp-SafeTrust/issues/530) the reads move to
  allow-listed queries under a least-privilege `mcp_reader` role.
- **Build-only.** `deploy-escrow` and `fund-escrow` ask the local `apps/api` to
  build a Testnet transaction and return the **unsigned XDR**. They never sign,
  never submit and never move funds. A human signs in the browser wallet
  (Freighter) and the frontend submits. _(tested: no MCP code calls a submit
  route or touches a secret key)_

### Never

| The MCP server never… | Why it matters | Enforced by |
|---|---|---|
| runs as a public HTTP MCP server | A network listener would need full authorization and would expose admin-level reads | stdio-only entry point _(tested)_ |
| submits a transaction on its own | Every on-chain step needs a human signature in the wallet | no submit route or Stellar SDK in `mcp/` _(tested)_ |
| holds or uses wallet private keys | Keys stay in the wallet; the MCP only sees public `G…` addresses | no secret keys or signing code in `mcp/` _(tested)_ |
| ships an end-user UI | It is contributor tooling, not product surface | the package is `private` and has no UI _(tested)_ |
| points at production URLs | Its credentials are admin-level; production data must never reach an AI client | localhost defaults _(tested)_; runtime refusal of remote hosts arrives with [#529](https://github.com/safetrustcr/dApp-SafeTrust/issues/529) |

If a change would break any row above, it needs its own design issue first — do
not add an HTTP transport, a signing step or a remote default in a feature PR.

## 2. Who and what

**Who may run it.** Maintainers and contributors working on a **local** stack
(`infra/backend` Hasura + Postgres, `apps/api`) with **Testnet** fixtures. Never
against a shared, staging or production environment.

### Configuration

The server reads only environment variables, from the MCP client's `env` block —
it does not load a `.env` file. The table is generated from
[`mcp/.env.example`](../../mcp/.env.example); edit that file and run
`pnpm --filter @safetrust/mcp docs:env`. _(tested: the table matches the file, and
every variable `mcp/src` reads is listed)_

<!-- env-table:begin (generated from mcp/.env.example by `pnpm --filter @safetrust/mcp docs:env`) -->
| Variable | Required | Default | What it grants |
|---|---|---|---|
| `HASURA_GRAPHQL_URL` | no | http://localhost:8080/v1/graphql | Where every Hasura read goes (get-escrow-status, get-apartment, list-apartments, query-*, hasura-query). Must be the local Hasura from infra/backend/bin/start. |
| `HASURA_ADMIN_SECRET` | yes, for every Hasura tool | none (local stack uses myadminsecretkey) | Hasura ADMIN access: every table, every row, row permissions bypassed. Treat all tool output as privileged. Local stack only; rotate per "Incident response" if exposed. HASURA_GRAPHQL_ADMIN_SECRET alone is not enough: the Hasura client reads HASURA_ADMIN_SECRET. |
| `SAFETRUST_API_URL` | no | http://localhost:3002 | Where deploy-escrow and fund-escrow send POST /api/escrow/* (unsigned XDR only), and where check-stack-health pings. Must be the local apps/api. |
| `PLATFORM_STELLAR_ADDRESS` | no | unset | Nothing: a public key shown by explain-escrow-roles. NEXT_PUBLIC_PLATFORM_ADDRESS is accepted as an alias. |
| `NEXT_PUBLIC_USDC_ADDRESS` | no | Testnet USDC issuer | Nothing: a public key shown by explain-escrow-roles. |
| `SAFETRUST_REPO_ROOT` | no | auto-detected (nearest pnpm-workspace.yaml) | Which local files the safetrust://docs/* resources read. Point it only at a SafeTrust checkout. |
<!-- env-table:end -->

### The Testnet test user

The escrow routes in `apps/api` require a signed-in Firebase user and an
`Idempotency-Key`. The Testnet test users come from the repository's own
provisioning script, which refuses to run against anything but Testnet:

```bash
# first run: generate disposable Testnet keypairs into .env.testnet.local (gitignored)
pnpm testnet:provision --generate
# later runs: verify accounts, trustlines, Firebase users and the seeded apartment
pnpm testnet:provision --check
```

It creates `guest@safetrust.local`, `host@safetrust.local` and
`admin@safetrust.local` (password from `E2E_TEST_PASSWORD`), funds their Testnet
wallets and seeds a host-owned apartment. See
[`docs/contributing/setup.md`](../contributing/setup.md#provision-isolated-stellar-testnet-accounts).

> **Status:** the MCP does not sign in as the test user yet, so `deploy-escrow`
> and `fund-escrow` currently get `401` from `apps/api`.
> [#528](https://github.com/safetrustcr/dApp-SafeTrust/issues/528) adds the
> test-user sign-in and the `Idempotency-Key` header; until then use the read
> tools and `orchestrate-escrow`.

## 3. Set it up

From a fresh clone, with Node 20+ and pnpm (`corepack enable`):

```bash
pnpm install
pnpm --filter @safetrust/mcp build          # produces mcp/dist/index.js

cd infra/backend && bin/start safetrust && cd ../..   # local Hasura + Postgres
pnpm --filter @safetrust/api dev                      # local apps/api (separate terminal)
```

The client needs an **absolute** path to `mcp/dist/index.js`. Run this from the
repository root to print it:

```bash
echo "$(pwd)/mcp/dist/index.js"
```

### Claude Code

```bash
# run from the repository root
claude mcp add \
  --env HASURA_GRAPHQL_URL=http://localhost:8080/v1/graphql \
  --env HASURA_ADMIN_SECRET=myadminsecretkey \
  --env SAFETRUST_API_URL=http://localhost:3002 \
  --transport stdio safetrust -- node "$(pwd)/mcp/dist/index.js"

claude mcp list          # safetrust: … - ✔ Connected
```

Keep `--transport stdio` between the last `--env` and the name `safetrust`;
otherwise the CLI reads the name as another `KEY=value` pair and rejects it.

The default `local` scope keeps the entry (and the secret) in your own
`~/.claude.json`. Do not use `--scope project`: it would write the secret into a
committed `.mcp.json`. Inside a session, `/mcp` shows the server, its tools and its
resources.

### Claude Desktop

Add to `claude_desktop_config.json` (macOS:
`~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`), then
restart Claude Desktop:

```json
{
  "mcpServers": {
    "safetrust": {
      "command": "node",
      "args": ["/absolute/path/to/dApp-SafeTrust/mcp/dist/index.js"],
      "env": {
        "HASURA_GRAPHQL_URL": "http://localhost:8080/v1/graphql",
        "HASURA_ADMIN_SECRET": "myadminsecretkey",
        "SAFETRUST_API_URL": "http://localhost:3002"
      }
    }
  }
}
```

### MCP Inspector

```bash
HASURA_ADMIN_SECRET=myadminsecretkey \
  npx @modelcontextprotocol/inspector --cli node mcp/dist/index.js --method tools/list
```

Drop `--cli … --method tools/list` to open the browser UI instead.

### Check it works

1. `tools/list` shows exactly the tools in the catalogue below.
2. `resources/list` includes `safetrust://docs/safetrust-mcp-trust-boundary`.
3. Calling `check-stack-health` reports `apps/api` and Hasura as healthy.
4. Calling `list-apartments` returns the seeded apartments.

Rebuild (`pnpm --filter @safetrust/mcp build`) and restart the client after any
change under `mcp/src` — stdio servers start once per session.

## 4. Tool catalogue

Every tool the server lists, with its default safety. _(tested: this table and
`tools/list` contain exactly the same tools; a tool that is not read-only cannot be
marked ✅)_

- ✅ **safe** — read-only against the local stack, or no I/O at all.
- ⚠️ **guarded** — changes local or Testnet state; returns unsigned XDR only.
- ❌ **unsafe** — arbitrary access; use only when no dedicated tool fits.

<!-- tool-catalogue:begin -->
| Tool | Safety | Enabled by default | Reads | Writes | Notes |
|---|---|---|---|---|---|
| `check-stack-health` | ✅ safe | yes | `apps/api` `/health`, Hasura `/healthz`, TrustlessWork Testnet | — | Liveness only; no data returned |
| `explain-escrow-roles` | ✅ safe | yes | — | — | Static role-mapping reference |
| `orchestrate-escrow` | ✅ safe | yes | — | — | Stateless lifecycle guide; calls nothing |
| `get-escrow-status` | ✅ safe | yes | Hasura (admin) `escrows` | — | Includes the stored unsigned XDR |
| `get-apartment` | ✅ safe | yes | Hasura (admin) `apartments`, owner name and wallet | — | |
| `list-apartments` | ✅ safe | yes | Hasura (admin) `apartments` | — | |
| `query-escrows` | ✅ safe | yes | Hasura (admin) `escrows` | — | Filtered, max 50 rows |
| `query-trustless-work-escrows` | ✅ safe | yes | Hasura (admin) `trustless_work_escrows` | — | Filtered, max 50 rows |
| `query-user-wallets` | ✅ safe | yes | Hasura (admin) `user_wallets`, `users` | — | Returns user e-mail addresses: privileged |
| `deploy-escrow` | ⚠️ guarded | yes | `apps/api` | `escrows` row + pending action (local), Testnet escrow via TrustlessWork | Unsigned XDR only; `401` until [#528](https://github.com/safetrustcr/dApp-SafeTrust/issues/528) |
| `fund-escrow` | ⚠️ guarded | yes | `apps/api` | Pending action (local) | Unsigned XDR only; `401` until [#528](https://github.com/safetrustcr/dApp-SafeTrust/issues/528) |
| `hasura-query` | ❌ unsafe | yes | Hasura (admin): **any table** | — | Mutations refused, but every table is readable; replaced by allow-listed reads and off by default with [#530](https://github.com/safetrustcr/dApp-SafeTrust/issues/530) |
<!-- tool-catalogue:end -->

## 5. Incident response

Use this when an AI client may have been exposed to privileged data or
credentials: a transcript with admin-level query output was shared, a client
config containing a secret was committed or synced, the server was pointed at a
non-local URL, or Hasura port `8080` was reachable from your network.

1. **Stop.** Remove the server from the client (`claude mcp remove safetrust`, or
   delete the `safetrust` block from `claude_desktop_config.json`) and restart it.
2. **Rotate the Hasura admin secret.** The local default `myadminsecretkey` is
   public; rotate whenever it, or what it can read, may have left your machine.
   `bin/start` and `docker-compose.yml` both read `HASURA_ADMIN_SECRET`:

   ```bash
   export HASURA_ADMIN_SECRET="$(openssl rand -hex 24)"
   cd infra/backend && bin/start safetrust && cd ../..
   ```

   Then put the new value in `apps/api/.env` and in the MCP client's `env`, and
   restart both. Once [#530](https://github.com/safetrustcr/dApp-SafeTrust/issues/530)
   lands, rotate the `mcp_reader` credential the same way.
3. **Rotate the Testnet test user.** `pnpm testnet:provision` does not change the
   password of a user that already exists, so delete the users first, then
   re-provision with fresh keys and a new password:
   - delete `guest@safetrust.local`, `host@safetrust.local` and
     `admin@safetrust.local` in Firebase Authentication (console, or the Auth
     emulator UI when `FIREBASE_AUTH_EMULATOR_HOST` is set) — this also revokes
     their sessions;
   - remove `E2E_GUEST_SECRET`, `E2E_HOST_SECRET` and `E2E_PLATFORM_SECRET` from
     `.env.testnet.local`;
   - run `E2E_TEST_PASSWORD='<new password>' pnpm testnet:provision --generate`,
     then `pnpm testnet:provision --check`.

   If CI stores these values as secrets, ask a maintainer to update them.
4. **Check what left.** Review the client transcript for rows from `users`,
   `user_wallets` and `escrows`. Testnet funds have no value, but e-mail
   addresses and Firebase UIDs are personal data, even in fixtures.
5. **Report.** Tell the maintainers in the issue tracker or the contributor
   channel: what was exposed, to which client, and when. Do not paste secrets
   into the report.

## Related

- [`mcp/README.md`](../../mcp/README.md): tool and resource reference for
  contributors extending the server.
- Hardening this page depends on: [#528](https://github.com/safetrustcr/dApp-SafeTrust/issues/528)
  (API auth as the test user), [#529](https://github.com/safetrustcr/dApp-SafeTrust/issues/529)
  (fail-closed config, refuse remote hosts),
  [#530](https://github.com/safetrustcr/dApp-SafeTrust/issues/530) (allow-listed
  reads under `mcp_reader`). Each of them updates the rows here that it changes;
  the trust-boundary test fails until it does.
