# SafeTrust API Routes Reference

Complete reference for all route handlers in `apps/api/src/routes/` and the
Next.js route handlers in `apps/frontend/src/app/api/`. Endpoints are mounted by
`apps/api/src/index.ts`.

- The Express API server runs on **port 3002** by default (`PORT`).
- Auth routes are mounted under `/api/auth`, escrow routes under `/api/escrow`,
  and message routes under `/api/messages`.
- All TrustlessWork-backed escrow routes return an **unsigned XDR** that the
  client must sign (e.g. with Freighter) before submitting it via
  `send-transaction`.

---

## Auth routes (`/api/auth`)

### `POST /api/auth/sync-user`

Handler: `apps/api/src/routes/auth/sync-user.handler.js`

Upserts a user row in Hasura from a Firebase JWT. Decodes the token payload
(the signature is **not** verified — marked `TODO` in the handler).

| Field | Type | Required | Notes |
|---|---|---|---|
| `phone_number` | string | no | |
| `country_code` | string | no | |
| `location` | string | no | |
| `dev_role` | string | no | Dev only — `guest` or `host`. **Completely ignored when `NODE_ENV === 'production'`** so contributors can test flows without calling promote-to-host. |

**Auth:** `Authorization: Bearer <Firebase JWT>` header required (returns
`401 Missing token` otherwise).

**Response `200`:** `{ success: true, user: { id, email } }`

**Errors:** `401` missing token · `500` Hasura sync failed / internal error

---

### `POST /api/auth/promote-to-host`

Handler: `apps/api/src/routes/auth/promote-to-host.handler.ts`

Grants the `host` role to the authenticated user. Ensures a `users` row exists
(if `sync-user` was never called), looks up the `host` role id, then inserts a
`user_roles` row with `ON CONFLICT DO NOTHING`.

**Input:** no body fields required.

**Auth:** `requireAuth` middleware (`apps/api/src/middleware/auth.middleware.js`)
— requires a valid Firebase token (resolves to `req.user.uid` / `req.user.email`).

**Response `200`:** `{ role: "host", promoted: true }`

**Errors:** `500` if the `host` role is not found in the `roles` table, or the
promotion fails.

---

### `POST /api/auth/activate-wallet`

Handler: `apps/api/src/routes/auth/activate-wallet.handler.js`

Calls the Pollar SDK to provision a Stellar wallet for the user, then stores the
returned address in `user_wallets` (chain `STELLAR`, `is_primary: true`,
provider `pollar`).

**Input:** no body fields required.

**Auth:** `Authorization: Bearer <Firebase JWT>` header required. `POLLAR_SECRET_KEY`
env var must be configured.

**Response `200`:** `{ address: string }`

**Errors:** `401` missing/invalid token · `500` Pollar not configured / Hasura
sync failed / internal · `502` Pollar activation failed or returned no address.

---

## Escrow routes (`/api/escrow`)

### `POST /api/escrow/deploy`

Handler: `apps/api/src/routes/escrow/deploy.handler.ts`

Creates a single-release escrow via TrustlessWork `/deployer/single-release` and
returns an unsigned XDR. Generates a new `engagementId` (UUID) used as the
idempotency key.

**Auth:** none middleware-level; validated by field checks.

| Field | Type | Required | Notes |
|---|---|---|---|
| `apartmentId` | string | yes | |
| `senderAddress` | string | yes | Tenant / signer |
| `receiverAddress` | string | yes | Owner / receiver |
| `amount` | number | yes | Must be a positive finite number |

**Response `200`:** `{ status, contractId, unsignedXDR, message, engagementId }`

**Errors:** `400` missing/invalid fields · `500` missing platform/trustline
address · `502` TrustlessWork deploy failed.

---

### `POST /api/escrow/fund`

Handler: `apps/api/src/routes/escrow/fund.handler.ts`

Builds a fund transaction via TrustlessWork `/escrow/single-release/v2/fund`.
Returns an unsigned XDR for the client to sign.

**Auth:** none middleware-level.

| Field | Type | Required | Notes |
|---|---|---|---|
| `contractId` | string | yes | |
| `signer` | string | yes | |
| `amount` | number | yes | Positive finite number |
| `engagementId` | string | yes | |

**Response `200`:** `{ unsignedXdr, txHash, contractId, engagementId }`

**Errors:** `400` missing/invalid fields · `502` TrustlessWork fund request
returned no unsigned transaction.

---

### `POST /api/escrow/milestone-status`

Handler: `apps/api/src/routes/escrow/milestone-status.handler.ts`

Marks a milestone as complete via TrustlessWork
`/escrow/single-release/v2/change-milestone-status`. Only `completed` is a valid
`newStatus`; `milestoneIndex` defaults to `0`.

**Auth:** none middleware-level.

| Field | Type | Required | Notes |
|---|---|---|---|
| `contractId` | string | yes | |
| `serviceProvider` | string | yes | |
| `engagementId` | string | yes | |
| `milestoneIndex` | number | no | Non-negative integer, defaults `0` |
| `newStatus` | string | no | Only `"completed"` accepted, default `"completed"` |
| `newEvidence` | string | no | Optional evidence string |

**Response `200`:** `{ unsignedXdr, txHash, contractId, engagementId, status: "milestone_approved" }`

**Errors:** `400` missing/invalid fields · `502` TrustlessWork returned no
unsigned transaction.

---

### `POST /api/escrow/release-funds`

Handler: `apps/api/src/routes/escrow/release-funds.handler.ts`

Builds a release transaction via TrustlessWork
`/escrow/single-release/v2/release-funds`.

**Auth:** none middleware-level.

| Field | Type | Required | Notes |
|---|---|---|---|
| `contractId` | string | yes | |
| `releaseSigner` | string | yes | |
| `engagementId` | string | no | |

**Response `200`:** `{ unsignedXdr, unsignedXDR, txHash, contractId, engagementId, status: "completed" }`

> `unsignedXDR` is kept only for legacy frontend consumers; `unsignedXdr` is the
> canonical key and the legacy key will be removed once callers migrate.

**Errors:** `400` missing/invalid fields · `502` TrustlessWork returned no
unsigned transaction or status `FAILED`.

---

### `POST /api/escrow/send-transaction`

Handler: `apps/api/src/routes/escrow/send-transaction.handler.ts`

Submits a client-signed XDR to TrustlessWork `/helper/send-transaction` and then
synchronises local state. Two calling modes:

- **Legacy mode** (no `action`): requires `signedXdr`, `contractId`,
  `engagementId`, `senderAddress`, `receiverAddress`; `status` may be
  `funded | milestone_approved | completed | resolved` (default `funded`).
- **Action mode** (with `action`): validates required fields per action and
  writes the corresponding DB record.

**Auth:** none middleware-level.

| Field | Type | Notes |
|---|---|---|
| `signedXdr` | string | Required |
| `action` | string | `initialize`, `fund`, `approve_milestone`, `release_funds`, `dispute`, `resolve_dispute` |
| `contractId` | string | Required |
| `engagementId` | string | |
| `propertyId` / `apartmentId` | string | Alias — used for `initialize` |
| `senderAddress` / `receiverAddress` | string | Used for `initialize` / legacy |
| `releaser` | string | Defaults to platform address |
| `amount` | number | Required for `initialize` / `fund` |
| `milestoneId`, `approver` | string | Required for `approve_milestone` |
| `releaseSigner` | string | Required for `release_funds` |
| `status` | string | Legacy mode only |

**Response `200`:** `{ status, message, contractId, transactionHash, engagementId }`
(`escrowId` is included for `initialize`).

**Errors:** `400` missing/invalid fields · `404` no escrow row for
`engagementId` · `409` contractId mismatch · `502` TrustlessWork failed ·
`500` DB sync failed after on-chain confirmation (returns `transactionHash`).

---

### `GET /api/escrow/status-stream`

Handler: `apps/api/src/routes/escrow/status-stream.handler.ts`

Server-Sent Events (SSE) stream of escrow status updates subscribed from Hasura
WebSocket (`services/hasura-ws.js`).

**Auth:** none middleware-level.

**Query param:** `contractId` (required string). Missing/empty → `400`.

**Response:** `text/event-stream` with events: `connected` (immediately),
`heartbeat` (every 30 s), and `status` (each escrow change as JSON). Closes on
client disconnect or Hasura error.

---

### `POST /api/escrow/recover-from-txhash`

Handler: `apps/api/src/routes/escrow/recover-from-txhash.handler.ts`

If a transaction was broadcast but the DB update failed, verifies it with the
TrustlessWork indexer (`/indexer/update-from-txHash`) and restores the local
escrow status from the tx hash.

**Auth:** none middleware-level.

| Field | Type | Required | Notes |
|---|---|---|---|
| `txHash` | string | yes | |
| `action` | string | yes | `initialize`, `fund`, `approve_milestone`, `release_funds`, `dispute`, `resolve_dispute` |
| `contractId` | string | yes | |
| `engagementId` | string | no | For `initialize` |
| `apartmentId` | string | no | For `initialize` |
| `senderAddress` / `receiverAddress` | string | no | For `initialize` |
| `releaser` | string | no | For `initialize` |
| `amount` | number | no | For `initialize` / `fund` |
| `milestoneId`, `approver` | string | no | For `approve_milestone` |
| `releaseSigner` | string | no | For `release_funds` |

**Response `200`:** `{ recovered: true, action, contractId, txHash, status }`
where `status` maps from the action (`funded`, `completed`, `disputed`,
`resolved`, `pending_signature`).

**Errors:** `400` missing/invalid fields · `404` no escrow row for `contractId` ·
`502` indexer verification failed.

---

## Next.js route handlers (`apps/frontend/src/app/api/`)

### `DELETE /api/auth/role-cookie` — `role-cookie/route.ts`

Invalidates the cached `user-role` httpOnly cookie by setting it with
`maxAge: 0` so the next dashboard navigation re-reads the role from Hasura. It
is called by the "Switch to Host view" flow right after promotion
(`apps/frontend/src/lib/auth/promote-to-host.ts`).

**Auth:** none (internal route handler).

**Response `200`:** `{ cleared: true }`

> Reading the role is **not** a HTTP route — the Next.js middleware
> (`apps/frontend/src/lib/middleware/fetch-user-role.ts`) reads the `user-role`
> cookie server-side and issues the `GetUserRoles` Hasura query directly.

---

## Pre-consolidation note (#308)

The escrow **write** routes previously lived in the Next.js app
(`apps/frontend/src/app/api/escrow/*`). As part of the Compute Resource
Consolidation pattern they were moved into the Express API below
(`apps/api/src/routes/escrow/`); the frontend is now a pure UI layer that reads
via Apollo Client → Hasura and writes via `fetch()` →
`http://localhost:3002/api/escrow/*`.

After consolidation (#308) the following legacy frontend routes are expected to
be removed:

- The `apps/frontend/src/app/api/escrow/` Next.js route handlers that duplicated
  the Express escrow endpoints (see `apps/frontend/src/app/api/escrow/README.md`).

`TRUSTLESS_WORK_API_KEY` is no longer needed in `apps/frontend/.env.local`.
