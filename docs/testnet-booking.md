# Real testnet booking: runbook

This runbook takes a new contributor through a real SafeTrust booking on
Stellar testnet, through the Trustless Work testnet API
(`https://dev.api.trustlesswork.com`): once by hand, then with the automated
specs.

- **Happy path:** deploy → fund → mark completed → approve → release
- **Dispute path:** deploy → fund → open dispute → admin resolves 50/50

The automated versions are `apps/frontend/e2e/golden-path.spec.ts` and
`apps/frontend/e2e/dispute-path.spec.ts`.

> Testnet only. Never use a mainnet key, a mainnet wallet or real funds.
> `pnpm testnet:provision` refuses to run against anything but testnet.

## Roles

| Role | User | Wallet | Escrow role (single-release) |
|---|---|---|---|
| Guest | `guest@safetrust.local` | `E2E_GUEST_SECRET` | approver + release signer; pays the deposit |
| Host | `host@safetrust.local` | `E2E_HOST_SECRET` | service provider + receiver |
| Platform | `admin@safetrust.local` (admin role) | `E2E_PLATFORM_SECRET` = `PLATFORM_STELLAR_ADDRESS` | dispute resolver |

The roles come from `apps/api/src/services/escrow-authz.ts`; the API sets them
when it deploys the escrow, and the browser can't change them.

## 1. Start a fresh stack

```bash
make infra-reset TENANTS=safetrust   # drops volumes, restarts Postgres + Hasura, applies metadata
make metadata-check                  # must report consistent metadata
```

## 2. Configure the API

Copy `apps/api/.env.example` to `apps/api/.env` and set:

```env
TRUSTLESS_WORK_API_URL=https://dev.api.trustlesswork.com
TRUSTLESS_WORK_API_KEY=<your Trustless Work testnet API key>
USDC_TRUSTLINE_ADDRESS=GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
PLATFORM_STELLAR_ADDRESS=<public key of E2E_PLATFORM_SECRET, step 3>
RECONCILIATION_SECRET=<same value as RECONCILIATION_SECRET in infra/backend/.env>
STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
HASURA_GRAPHQL_URL=http://localhost:8080/v1/graphql
HASURA_ADMIN_SECRET=<infra/backend/.env value>
FIREBASE_PROJECT_ID=...           # or FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

- `USDC_TRUSTLINE_ADDRESS` is Circle's testnet USDC issuer. Check it against
  [Circle's USDC addresses](https://developers.circle.com/stablecoins/usdc-contract-addresses).
- `RECONCILIATION_SECRET` must match on both sides. Hasura's cron calls
  `POST /reconciliation/sync-escrows` every 2 minutes with it, and that job
  confirms submitted transactions on Horizon (`apps/api/src/services/escrow-reconcile.ts`).
  If the secrets differ, every cron call returns 401.

## 3. Provision the testnet accounts

```bash
pnpm testnet:provision --generate   # first time: creates the three keypairs
```

`--generate` writes `E2E_GUEST_SECRET`, `E2E_HOST_SECRET` and
`E2E_PLATFORM_SECRET` to `.env.testnet.local` at the repo root (git-ignored).
Later runs use `pnpm testnet:provision` without the flag.

The script:

1. Funds the guest, host and platform accounts with Friendbot (testnet XLM).
2. Adds a USDC trustline for `USDC_TRUSTLINE_ADDRESS` to **all three** accounts.
3. Checks the guest holds testnet USDC. **On a fresh guest it stops here**:
   do step 4, then run `pnpm testnet:provision` again.
4. Creates the Firebase users `guest@`, `host@` and `admin@safetrust.local`
   (password `E2E_TEST_PASSWORD`, default `Password123!`), gives them their
   roles and links their wallets: guest and host as primary wallets, the
   platform wallet to the admin.
5. Creates a "Testnet Demo Apartment" owned by the host and prints its id.

Put the platform public key into `PLATFORM_STELLAR_ADDRESS` (step 2). To print
the public keys:

```bash
set -a; . ./.env.testnet.local; set +a
node -e "const {Keypair}=require('@stellar/stellar-sdk'); for (const k of ['E2E_GUEST_SECRET','E2E_HOST_SECRET','E2E_PLATFORM_SECRET']) console.log(k, Keypair.fromSecret(process.env[k]).publicKey())"
```

## 4. Get testnet USDC for the guest

Open [faucet.circle.com](https://faucet.circle.com/), choose **Stellar** and
**Testnet**, and paste the guest's public key. The trustline from step 3 must
exist first, or the transfer fails.

Each automated spec escrows `E2E_DEPOSIT_USDC` (default `2`). The demo
apartment from step 3 has a 300 USDC deposit, which is more than the faucet
gives. For a booking by hand, lower it first:

```graphql
mutation { update_apartments(where: { name: { _eq: "Testnet Demo Apartment" } }, _set: { warranty_deposit: 2 }) { affected_rows } }
```

Then confirm everything:

```bash
pnpm testnet:provision --check      # exits 0 when accounts, trustlines and wallet links are ready
```

## 5. Start the apps

```bash
pnpm dev                            # api on :3002, web on :3001
curl -s http://localhost:3002/health
```

For a booking by hand, use Freighter (set to **Testnet**) with the guest's
secret in one browser profile and the host's secret in another.

## 6. Happy path by hand

Sign in at `http://localhost:3001/login` as `guest@safetrust.local`, open
`/apartment/<apartment id>` and choose **Create escrow**. Sign each
transaction in Freighter when asked. Do each step only after the previous one
shows up on the explorer.

| # | Who | Action in the UI | API call | SafeTrust `escrows.status` | `check_in` milestone | Trustless Work (on chain) |
|---|---|---|---|---|---|---|
| 1 | Guest | **Create escrow** | `POST /api/escrow/deploy` → `send-transaction` | `pending_signature` → `created` | `pending` | contract exists, `balance` 0, no flags set |
| 2 | Guest | **Fund Escrow** | `POST /api/escrow/fund` | `funded` | `pending` | `balance` = deposit |
| 3 | Host | **Mark Completed** | `POST /api/escrow/milestone-status` | `funded` (unchanged) | `completed` | `milestones[0].status` = `completed`, not approved |
| 4 | Guest | **Approve Milestone** | `POST /api/escrow/approve-milestone` | `milestone_approved` | `approved` | `milestones[0].approved` = true |
| – | Host | (direct API call) | `POST /api/escrow/release-funds` | unchanged | unchanged | **403**: only the release signer can release |
| 5 | Guest | **Release Funds** | `POST /api/escrow/release-funds` | `completed` | `released` | `flags.released` = true, `balance` 0; host received the deposit |

The UI submits every signed XDR to `POST /api/escrow/send-transaction`.
Sending the same signed XDR again returns `200` with `replay: true`, and
Trustless Work isn't called a second time.

## 7. Dispute path by hand

Use a **new apartment**. SafeTrust allows one escrow per apartment per guest
(engagement id `rental:<apartmentId>:<guestUid>`), so a second deploy on the
same apartment returns the existing escrow. Copy the demo apartment in the
Hasura console, or let the automated spec create one.

| # | Who | Action | SafeTrust `escrows.status` | Trustless Work (on chain) |
|---|---|---|---|---|
| 1 | Guest | **Create escrow** | `created` | contract exists, `balance` 0 |
| 2 | Guest | **Fund Escrow** | `funded` | `balance` = deposit |
| 3 | Guest | **Open Dispute** | `disputed` | `flags.disputed` = true |
| – | Host | `POST /api/escrow/resolve-dispute` | unchanged | **403**: admin role required |
| 4 | Admin (platform wallet in Freighter) | **Resolve Dispute**, 50 % approver / 50 % service provider | `resolved` | `flags.resolved` = true, `balance` 0 |

Then check both USDC balances on the explorer. Compared with just before the
dispute was resolved, the guest and the host each gained half the deposit.
Trustless Work may keep a small protocol fee from each payout, and the specs
allow up to 1 % (`E2E_PAYOUT_FEE_TOLERANCE`). The platform fee is 0.

The resolve call takes roles, not addresses:

```json
{ "engagementId": "rental:…", "distributions": [
  { "role": "approver", "amount": 1 },
  { "role": "serviceProvider", "amount": 1 } ] }
```

The amounts must add up to the escrow amount. The API looks up the recipient
addresses from the escrow roles.

## 8. Checking a step yourself

**SafeTrust** (Hasura console, `http://localhost:8080`):

```graphql
query ($e: String!) {
  escrows(where: { engagement_id: { _eq: $e } }) { status contract_id amount }
  escrow_pending_actions(where: { engagement_id: { _eq: $e } }, order_by: { created_at: asc }) { action status tx_hash }
}
```

**Trustless Work**, read from the ledger:

```bash
curl -s -H "x-api-key: $TRUSTLESS_WORK_API_KEY" \
  "https://dev.api.trustlesswork.com/helper/get-escrow-by-contract-ids?contractIds[]=$CONTRACT_ID&validateOnChain=true"
```

**Explorer:**

- Transaction: `https://stellar.expert/explorer/testnet/tx/<hash>`
- Contract: `https://stellar.expert/explorer/testnet/contract/<C…>`
- Account balances: `https://stellar.expert/explorer/testnet/account/<G…>`

## 9. Automated run

```bash
pnpm --filter @safetrust/web exec playwright install chromium   # once
pnpm --filter @safetrust/web test:e2e
```

The specs sign in through Firebase, create a fresh apartment owned by the
host, and drive the booking through `apps/api` exactly as the web app does:
build, sign with the role's test secret, then `send-transaction`. After each
step they wait for the transaction on Horizon, then assert:

- the SafeTrust escrow row (and the `check_in` milestone) in Hasura, and
- the contract state from `GET /helper/get-escrow-by-contract-ids?validateOnChain=true`.

Settings the specs read come from the shell, `apps/frontend/.env.e2e.local`,
`.env.testnet.local` or `apps/api/.env`, in that order (see
`apps/frontend/.env.example`). Besides the API values above, they need
`NEXT_PUBLIC_FIREBASE_API_KEY` (or `FIREBASE_AUTH_EMULATOR_HOST`) to sign in.

**Rate limit.** Trustless Work allows 50 requests per 60 s per API key. The
specs run one at a time (`workers: 1`) and count every request they cause,
whether a build or submit through the API or a direct lookup. When a request
would go over `E2E_TW_RATE_BUDGET` (default 40) in the last 60 s, they wait.
One happy path costs about 16 requests and one dispute path about 12.

**Retries are off.** A retry would book again and spend more faucet USDC.

**Tx hashes for the PR.** Each spec prints a table of its transactions with
explorer links and attaches it to the HTML report as
`testnet-transactions.md` (`apps/frontend/playwright-report`). Paste one
happy-path table and one dispute-path table into the PR.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `503 ESCROW_NOT_CONFIGURED` on deploy | `PLATFORM_STELLAR_ADDRESS` or `USDC_TRUSTLINE_ADDRESS` missing in `apps/api/.env` |
| `403 WALLET_NOT_REGISTERED` on deploy | the guest wallet isn't linked: rerun `pnpm testnet:provision` |
| `409 HOST_WALLET_MISSING` | the host has no primary wallet: rerun `pnpm testnet:provision` |
| `404 UNKNOWN_TRANSACTION` on send-transaction | `escrow_pending_actions` isn't tracked in Hasura: `make metadata-check` |
| `403` from resolve-dispute as admin | `PLATFORM_STELLAR_ADDRESS` isn't the admin's linked wallet (`E2E_PLATFORM_SECRET`) |
| Fund fails on chain | the guest has too little USDC, or no trustline |
| `502` from Trustless Work with a 429 in the log | rate limit: wait 60 s; lower `E2E_TW_RATE_BUDGET` if other tools share the key |
| Cron reconciliation returns 401 | `RECONCILIATION_SECRET` differs between `apps/api/.env` and `infra/backend/.env` |
