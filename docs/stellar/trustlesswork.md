# TrustlessWork API Integration & Stellar Infrastructure

This document details SafeTrust's integration with TrustlessWork — the middleware framework that facilitates Soroban escrow smart contract deployments, milestone management, fund releases, and event handling on the Stellar network.

---

## 1. API Base URLs & Configuration

TrustlessWork provides distinct environments for Stellar Testnet and Mainnet operations. SafeTrust selects the appropriate environment via environment variables:

| Environment | Base URL | SDK Export | Env Variable |
| --- | --- | --- | --- |
| **Testnet / Development** | `https://dev.api.trustlesswork.com` | `development` | `NEXT_PUBLIC_TRUSTLESS_WORK_ENV=development` |
| **Mainnet** | `https://mainnet.api.trustlesswork.com` | `mainNet` | `NEXT_PUBLIC_TRUSTLESS_WORK_ENV=mainnet` |

### Environment Variables
- `TRUSTLESS_WORK_API_URL`: Server-side API endpoint base URL.
- `TRUSTLESS_WORK_API_KEY`: API authentication key sent in the `x-api-key` HTTP header.
- `NEXT_PUBLIC_TRUSTLESS_WORK_API_KEY`: Public client key used by `@trustless-work/escrow` React provider.

---

## 2. USDC SEP-41 Contract Addresses

Escrow funding and settlement in SafeTrust utilize standard SEP-41 compliant USDC tokens on Stellar:

| Network | USDC SEP-41 Contract Address | Variable Name |
| --- | --- | --- |
| **Testnet** | `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` | `USDC_TRUSTLINE_ADDRESS` / `NEXT_PUBLIC_USDC_ADDRESS` |
| **Mainnet** | `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75` | `USDC_TRUSTLINE_ADDRESS` / `NEXT_PUBLIC_USDC_ADDRESS` |

These addresses are configured in the `trustline` object sent during contract initialization:

```json
{
  "trustline": {
    "symbol": "USDC",
    "address": "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA"
  }
}
```

---

## 3. Endpoints Used by SafeTrust

The following table summarizes all TrustlessWork endpoints consumed by SafeTrust API handlers:

| SafeTrust Endpoint | Purpose | Handler File | TrustlessWork API Route |
| --- | --- | --- | --- |
| `POST /api/escrow/deploy` | Deploy Soroban contract | [`deploy.handler.ts`](file:///c:/Users/DELL/Documents/GitHub/dApp-SafeTrustOjay/apps/api/src/routes/escrow/deploy.handler.ts) | `POST /deployer/single-release` |
| `POST /api/escrow/fund` | Fund escrow with USDC | [`fund.handler.ts`](file:///c:/Users/DELL/Documents/GitHub/dApp-SafeTrustOjay/apps/api/src/routes/escrow/fund.handler.ts) | `POST /escrow/single-release/v2/fund` |
| `POST /api/escrow/milestone-status` | Mark milestone complete | [`milestone-status.handler.ts`](file:///c:/Users/DELL/Documents/GitHub/dApp-SafeTrustOjay/apps/api/src/routes/escrow/milestone-status.handler.ts) | `POST /escrow/single-release/v2/change-milestone-status` |
| `POST /api/escrow/release-funds` | Release USDC to host | [`release-funds.handler.ts`](file:///c:/Users/DELL/Documents/GitHub/dApp-SafeTrustOjay/apps/api/src/routes/escrow/release-funds.handler.ts) | `POST /escrow/single-release/v2/release-funds` |
| `POST /api/escrow/send-transaction` | Submit signed XDR payload | [`send-transaction.handler.ts`](file:///c:/Users/DELL/Documents/GitHub/dApp-SafeTrustOjay/apps/api/src/routes/escrow/send-transaction.handler.ts) | `POST /helper/send-transaction` |
| `POST /api/escrow/resolve-dispute` | Resolve contract dispute | `resolve-dispute.handler.ts` | `POST /escrow/single-release/v2/resolve-dispute` |

---

## 4. Webhook Events & HMAC Verification

TrustlessWork sends webhook notifications upon on-chain status transitions to sync off-chain Hasura database state.

### Webhook Event Types

- `escrow.initialized`: Fires when Soroban contract deployment is confirmed on-chain.
- `escrow.funded`: Fires when guest deposits USDC collateral into escrow.
- `escrow.released`: Fires when funds are successfully transferred to host.
- `escrow.disputed`: Fires when a dispute is opened by either party.
- `escrow.resolved`: Fires when dispute resolution is settled on-chain.

### HMAC Signature Verification Pattern

To guarantee webhook authenticity, SafeTrust verifies incoming requests using SHA-256 HMAC signatures:

```typescript
// apps/frontend/src/app/webhooks/escrow-status/route.ts
import { createHmac, timingSafeEqual } from 'crypto';

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const actual = signature.startsWith('sha256=') ? signature.slice(7) : signature;
  
  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(actual, 'utf8');
  
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}
```

- **Headers Checked**: `x-trustless-work-signature`, `x-webhook-signature`, or `x-signature`.
- **Secret**: `TRUSTLESS_WORK_WEBHOOK_SECRET`.
- **Security Standard**: `crypto.timingSafeEqual` prevents side-channel timing attacks.

---

## 5. Role Mapping Architecture

TrustlessWork single-release contracts enforce access control using specific role assignments during deployment:

```json
{
  "roles": {
    "approver": "<senderAddress>",
    "serviceProvider": "<receiverAddress>",
    "platformAddress": "<platformAddress>",
    "releaseSigner": "<platformAddress>",
    "disputeResolver": "<platformAddress>",
    "receiver": "<receiverAddress>"
  }
}
```

### Role Mapping Definitions

| TrustlessWork Role | SafeTrust Party | Description & Permissions |
| --- | --- | --- |
| `senderAddress` / `approver` | **Guest** | The user renting the apartment. Approves milestones and authorizes fund deposits/releases. |
| `receiverAddress` / `serviceProvider` / `receiver` | **Host** | The property owner/host. Receives released USDC payouts and marks milestone fulfillment. |
| `platformAddress` / `releaseSigner` / `disputeResolver` | **SafeTrust Platform** | Platform wallet (`PLATFORM_STELLAR_ADDRESS`). Co-signs releases and resolves disputes if raised. |
