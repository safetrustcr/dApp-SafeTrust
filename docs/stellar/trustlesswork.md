# TrustlessWork API Integration

This is the escrow integration contract SafeTrust relies on for TrustlessWork-driven Stellar transactions. The implementation is centered in the backend escrow routes and the frontend provider configuration, with the backend acting as the trusted API gateway for all privileged TrustlessWork calls.

## 1. API base URLs

SafeTrust switches between TrustlessWork environments based on network configuration:

- Testnet / development: `https://dev.api.trustlesswork.com`
  - Used by the backend default config in `apps/api/src/lib/trustlesswork.js` and the SDK `development` environment in `apps/frontend/src/providers/TrustlessWorkProvider.tsx`.
- Mainnet: `https://api.trustlesswork.com`
  - Used when `NEXT_PUBLIC_TRUSTLESS_WORK_ENV === "mainnet"` in the frontend provider.

The backend server route uses `TRUSTLESS_WORK_API_URL` and adds the API key as an authenticated header before calling TrustlessWork. This keeps the privileged secret out of the browser.

## 2. USDC SEP-41 contract addresses

SafeTrust uses the TrustlessWork USDC trustline addresses for escrow funding and release flows:

- Testnet: `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`
- Mainnet: `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75`

These addresses are bound into escrow configuration via the `trustline.address` field passed to the `deployer/single-release` request, as shown in `apps/api/src/routes/escrow/deploy.handler.ts`.

## 3. TrustlessWork endpoints used by SafeTrust

The SafeTrust escrow flow is composed of these TrustlessWork-backed calls:

| Endpoint | Method | Purpose | Code reference |
| :--- | :--- | :--- | :--- |
| `/deployer/single-release` | POST | Initialize a single-release escrow and receive an unsigned XDR | `apps/api/src/routes/escrow/deploy.handler.ts` |
| `/escrow/single-release/v2/fund` | POST | Fund an existing escrow with the guest wallet | `apps/api/src/routes/escrow/fund.handler.ts` |
| `/escrow/single-release/v2/change-milestone-status` | POST | Mark a milestone as completed and prepare the signed transaction | `apps/api/src/routes/escrow/milestone-status.handler.ts` |
| `/escrow/single-release/v2/release-funds` | POST | Release platform-approved funds from escrow | `apps/api/src/routes/escrow/release-funds.handler.ts` |
| `/helper/send-transaction` | POST | Submit the signed XDR back to TrustlessWork after Freighter signs it | `apps/frontend/src/app/helper/send-transaction/route.ts` |

The backend contract is intentionally server-first:

- `apps/api/src/routes/escrow/*.ts` builds the unsigned transaction payloads.
- The browser receives the unsigned XDR, signs it with Freighter, and submits it back through the local helper route.
- The helper route submits the final signed XDR to TrustlessWork for execution.

## 4. Role mapping: SafeTrust parties to TrustlessWork roles

SafeTrust maps the escrow parties to TrustlessWork roles by wallet and permission model.

| SafeTrust party | TrustlessWork field | Why it is used |
| :--- | :--- | :--- |
| Guest | `senderAddress` | The tenant or guest funds the escrow and acts as the payer / approver in the escrow roles object. |
| Host | `receiverAddress` | The property host receives the funds once conditions are satisfied. |
| Platform | `releaser` / `platformAddress` | SafeTrust operates as the release signer and dispute authority, confirming release conditions. |

The deploy payload in `apps/api/src/routes/escrow/deploy.handler.ts` shows the role mapping clearly:

- `approver: senderAddress`
- `serviceProvider: receiverAddress`
- `platformAddress: process.env.PLATFORM_STELLAR_ADDRESS`
- `releaseSigner: platformAddress`
- `disputeResolver: platformAddress`
- `receiver: receiverAddress`

This keeps the guest as the funder, the host as the receiver, and the platform as the release authority.

## 5. Webhook HMAC verification pattern

TrustlessWork webhooks must be treated as untrusted network input until they are verified. The verification pattern SafeTrust follows is:

1. Read the incoming signature header, typically `x-tw-signature` or the exact header TrustlessWork documents for the event.
2. Read the raw request body exactly as received.
3. Recompute the HMAC-SHA256 using the shared secret configured server-side.
4. Compare the computed digest to the incoming signature using a constant-time comparison function.
5. Reject the webhook immediately if the signature mismatch is detected, and only then process the event payload.

In practical terms, the enforcement pattern is:

```ts
const signature = req.headers['x-tw-signature'];
const rawBody = await getRawBody(req);
const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
  throw new Error('Invalid TrustlessWork webhook signature');
}
```

This prevents replay or tampering attempts from reaching escrow state handlers.

## 6. Security note: keep `TRUSTLESS_WORK_API_KEY` server-side only

> Warning: `TRUSTLESS_WORK_API_KEY` is a privileged credential and must never be included in any `NEXT_PUBLIC_` environment variable.

Why this matters:

- The backend creates the TrustlessWork request in `apps/api/src/lib/trustlesswork.js` and sends the key as the `Authorization` header.
- The frontend provider in `apps/frontend/src/providers/TrustlessWorkProvider.tsx` explicitly warns when `NEXT_PUBLIC_TRUSTLESS_WORK_API_KEY` is missing, but that value is not the safe architecture for production.
- If the key leaks into a browser bundle or a `NEXT_PUBLIC_` variable, attackers can forge requests to deploy, fund, or release escrow funds through the TrustlessWork API.

SafeTrust should therefore keep all TrustlessWork keys in server-side environment variables only and route all escrow operations through the backend API rather than exposing the secret to the client.

## Summary

The SafeTrust TrustlessWork flow is a classic server-assisted XDR pipeline:

1. The backend creates the escrow and unsigned transaction.
2. The browser signs it with Freighter.
3. The signed XDR is sent back to the backend helper route.
4. The final transaction is submitted to TrustlessWork and the escrow state is synced to the platform DB.

That pattern keeps the API key and release authority on the server while preserving wallet custody in the browser.
