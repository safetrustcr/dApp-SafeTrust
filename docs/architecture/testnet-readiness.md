# Trustless Work testnet readiness

## Implemented safety boundary

SafeTrust uses this command path for all escrow writes:

```text
Browser → Firebase ID token → apps/api → Trustless Work testnet
                              ↑
                    server-only API key
```

The browser signs unsigned XDR with the user's Stellar wallet, then submits the
signed XDR to `apps/api`. It never receives the Trustless Work secret key.

## Required local configuration

Set these values in `apps/api/.env`; do not add them to any `NEXT_PUBLIC_*`
variable or commit them:

```env
TRUSTLESS_WORK_API_URL=https://dev.api.trustlesswork.com
TRUSTLESS_WORK_API_KEY=your-testnet-secret-key
PLATFORM_STELLAR_ADDRESS=G...
USDC_TRUSTLINE_ADDRESS=GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
RECONCILIATION_SECRET=same-value-as-infra/backend/.env
```

- `TRUSTLESS_WORK_API_KEY`: a real Trustless Work testnet key. It belongs only in `apps/api/.env`; `apps/frontend` never calls Trustless Work.
- `USDC_TRUSTLINE_ADDRESS`: the issuer of the USDC asset escrows use. The value above is Circle's testnet issuer; confirm it against [Circle's USDC addresses](https://developers.circle.com/stablecoins/usdc-contract-addresses).
- `PLATFORM_STELLAR_ADDRESS`: a funded testnet account with a USDC trustline. If it or `USDC_TRUSTLINE_ADDRESS` is missing, deploy and readiness return `503 ESCROW_NOT_CONFIGURED` and the API log names the missing variable.
- `STELLAR_NETWORK_PASSPHRASE`: the one network setting, read by `apps/api` and `apps/frontend` under the same name. Use the full passphrase; the API refuses to start on a label such as `TESTNET`.
- `RECONCILIATION_SECRET`: must equal the value Hasura's reconciliation cron sends (`infra/backend/.env`). Docker Compose falls back to `myreconciliationsecret` for both containers when it is unset.

### Test accounts

Before booking on testnet:

1. **Guest and host**: fund each with testnet XLM from Friendbot and add a USDC trustline for `USDC_TRUSTLINE_ADDRESS`.
2. **Guest**: also needs testnet USDC (Circle faucet, below) to fund the escrow.
3. **Platform** (`PLATFORM_STELLAR_ADDRESS`): fund with Friendbot and add the USDC trustline.

`pnpm testnet:provision` does steps 1 and 3 for the e2e accounts.

`FIREBASE_*` admin credentials must also be configured for the API so it can verify browser ID tokens. The escrow detail stream is currently a read-only development endpoint; do not expose it beyond local development until it authenticates a participant for the requested escrow.

Before attempting a transaction, every wallet participating in the flow must meet the wallet readiness checks.

## Wallet readiness requirements

| Requirement | Why | Fix on Testnet | Mainnet behavior |
| :--- | :--- | :--- | :--- |
| **Connected wallet registered** | SafeTrust enforces caller authorization (#443) | "Link this wallet" (`/api/auth/sync-wallet`) or switch wallet | Switch or link wallet |
| **Account exists + spare XLM** | Stellar base reserve (`(2 + subentries) × 0.5 XLM`) + 1.0 XLM fee buffer | "Fund with Friendbot" (`https://friendbot.stellar.org?addr=...`) | Deposit XLM to cover reserve & fees |
| **USDC trustline** | Stellar accounts cannot hold custom assets without an explicit trustline for the configured issuer (`USDC_TRUSTLINE_ADDRESS`) | "Add USDC trustline" (sign unsigned `changeTrust` XDR from `/api/escrow/readiness/trustline` and submit to Horizon) | Sign `changeTrust` XDR |
| **USDC balance ≥ amount** | The fund escrow transaction transfers the deposit/payment in USDC | Testnet faucet: [Circle USDC Testnet Faucet](https://faucet.circle.com/) | Deposit USDC |
| **Host USDC trustline** | Release funds transfers deposit to host | Blocks guest until host completes wallet setup ("Message host") | Blocks guest until host completes wallet setup |
| **Platform USDC trustline** | Platform fees transfer to `PLATFORM_STELLAR_ADDRESS` | Checked server-side | Checked server-side |

### Testnet faucets

- **XLM Faucet (Friendbot)**: `https://friendbot.stellar.org?addr={publicKey}`
- **USDC Faucet**: For Circle's official Testnet USDC issuer (`GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`), obtain testnet USDC from [https://faucet.circle.com/](https://faucet.circle.com/).


## Verified API contract

The server uses the current documented single-release paths:

- `POST /deployer/single-release`
- `POST /escrow/single-release/fund-escrow`
- `POST /escrow/single-release/change-milestone-status`
- `POST /escrow/single-release/release-funds`
- `POST /helper/send-transaction`

These build unsigned XDRs; a real testnet transaction cannot be proven without
a valid API key and a user-controlled funded wallet.

## Open production blockers

1. **Configure the Trustless Work secret.** The current local API environment
   has an empty `TRUSTLESS_WORK_API_KEY`, so a live request must fail safely.
2. **Resolve Hasura metadata inconsistency.** [RESOLVED in #441, #493] Hasura metadata
   is consistent on a fresh local stack (`make infra-reset`). Out-of-scope tenant
   objects were removed from the safetrust metadata build, trigger/action
   environment variables (`HASURA_EVENT_SECRET`, `WEBHOOK_ADMIN_SECRET`) were
   configured in `.env.example` and `docker-compose.yml`, and `make metadata-check`
   now runs in CI to prevent regressions.
3. **Unify the two persistence projections.** `escrows` drives the apartment
   payment UI while `trustless_work_escrows` plus `escrow_milestones` drives the
   lifecycle state. Define one canonical escrow record and synchronize the
   other projection transactionally or remove it.
4. **Add integration tests.** Use a dedicated funded testnet wallet pair and
   test deploy → sign → submit → fund → milestone → release. Never use a
   production key, a production wallet, or real funds in CI.
5. **Cron reconciliation is implemented and authenticated.** `POST /reconciliation/sync-escrows`
   is mounted in `apps/api` and protected by `x-reconciliation-secret`, so the
   Hasura cron can confirm submitted transaction hashes and reconcile forward-only
   drift without a browser session. Inbound Trustless Work webhooks remain
   disabled until the provider publishes an HMAC signature and replay-protection
   contract for the endpoint.

## Non-blocking library note

The monorepo already includes the wallet kit, React Hook Form, Stellar SDK,
Trustless Work SDK, Axios, date picker, and Recharts. It does not currently
need React Query, React Table, Zod, or Hook Form resolvers for the implemented
flow; add them only with a concrete query/table/schema migration.
