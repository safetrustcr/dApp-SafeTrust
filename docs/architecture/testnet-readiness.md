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
USDC_TRUSTLINE_ADDRESS=G...
```

`FIREBASE_*` admin credentials must also be configured for the API so it can verify browser ID tokens. The escrow detail stream is currently a read-only development endpoint; do not expose it beyond local development until it authenticates a participant for the requested escrow.

Before attempting a transaction, every wallet participating in the flow must:

1. Be on Stellar testnet.
2. Hold test XLM for transaction fees.
3. Have a trustline for the same testnet asset issuer configured above.
4. Match the escrow role address: tenant/approver, host/service provider, or
   platform/dispute resolver.

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
2. **Resolve Hasura metadata inconsistency.** [RESOLVED in #441] Hasura metadata
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
