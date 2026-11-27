# Pollar Configuration & Readiness for Testnet Escrows (#588)

## Overview

SafeTrust integrates **Pollar** (`@pollar/react`, `@pollar/core`) to provide embedded Stellar wallets for guests and non-crypto-native users (social/email login without browser extensions).

When a user logs in with Pollar:
1. Pollar creates the embedded Stellar keypair.
2. Pollar activates the Stellar account on-chain.
3. Pollar enables trustlines for all assets configured in the **Pollar Dashboard**.
4. Pollar sponsors network fees per the configured **Funding Mode**.

This document outlines the required Pollar dashboard configuration, environment variables, fee sponsorship mechanics, and readiness checks for testnet escrows.

---

## 1. Where API Keys Come From

Configure keys in your environment files:

| Environment Variable | Location | Description | Where to Get |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY` | `apps/frontend/.env.local` | Client-side publishable key used by `@pollar/react` (`PollarProvider`) | Pollar Dashboard → **API Keys** → **Publishable Key** |
| `POLLAR_SECRET_KEY` | `apps/api/.env` | Server-side secret key used by `POST /api/auth/activate-wallet` | Pollar Dashboard → **API Keys** → **Secret Key** |

> **Security Note**: Never commit real secret keys. Keep `POLLAR_SECRET_KEY` strictly on the backend (`apps/api`).

---

## 2. Pollar Dashboard Setup Checklist

To ensure escrows pass readiness checks and transactions can be executed on testnet, configure your Pollar application dashboard as follows:

### Step 1: Set App Mode to "Test"
- In the Pollar Dashboard, toggle your application environment to **Test mode**.
- Test mode connects to the Stellar Testnet (`https://horizon-testnet.stellar.org`).
- Do not use Production mode for testnet escrow development.

### Step 2: Enable the Stellar Network
- Under **Networks / Blockchains**, ensure **Stellar** is selected and enabled.

### Step 3: Configure the Testnet USDC Asset & Trustline
By default, the Pollar quickstart example configures the mainnet Circle USDC issuer (`GA5Z...`). If this issuer is left unchanged, testnet escrows will fail the trustline check (`readiness: { usdcTrustline: { ok: false } }`).

SafeTrust testnet escrows require the Stellar Testnet USDC asset:
- **Asset Code**: `USDC`
- **Asset Issuer**: `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` (`USDC_TRUSTLINE_ADDRESS`)

**Why this matters:**
When configured in the Pollar Dashboard, Pollar automatically submits a `changeTrust` operation for this exact testnet USDC issuer as part of wallet onboarding. Without it, the guest wallet will lack the necessary trustline to receive or lock escrow funds.

### Step 4: Configure Funding Mode & Sponsorship
Pollar supports two primary sponsorship models for transaction fees:

1. **Pollar Credits Pool (Managed Sponsorship)**:
   - Pollar covers the base reserves and transaction fees using pre-purchased credits.
   - When credits run out, API/SDK requests will return `SDK_CREDITS_INSUFFICIENT`.
   - **Remedy**: Top up your credit balance in the Pollar Dashboard under **Billing & Credits**.

2. **Custom Gas Wallet (Self-Funded Sponsorship)**:
   - You provide a dedicated Stellar account funded with XLM to sponsor account creations and transaction fees.
   - Ensure your sponsorship wallet maintains sufficient XLM to cover activation base reserves (`2 XLM` base + `0.5 XLM` per trustline subentry) and fee buffers.

### Step 5: Signature-Confirmation Policy
- In **Security / Policies**, configure your transaction confirmation threshold and signing policies.
- Pollar handles signing under the app's policy. When transactions require multi-sig or user consent, Pollar presents embedded confirmation prompts.

---

## 3. Escrow Wallet Readiness Behavior

SafeTrust validates guest wallets before escrow deployment using `checkWalletReadiness` in `apps/api/src/services/wallet-readiness.ts`.

### Fee Coverage for Sponsored Wallets
- **Standard Wallets (e.g. Freighter)**: Require `(2 + subentries) × 0.5 + 1.0 XLM` (`calculateXlmThreshold`) to cover account base reserve, trustline subentries, and transaction fee buffers.
- **Sponsored Pollar Wallets**: Network fees and trustline subentries are sponsored by Pollar. The readiness service recognizes Pollar wallets (`provider: 'pollar'`) as **fee-covered**, reporting `xlmForFees: { ok: true, sponsored: true }` without requiring guests to hold native XLM.

### Differentiating "Activating" from "Not Funded"
Account creation on-chain is asynchronous. If an escrow readiness check or transaction is dispatched before Pollar finishes activating the account on Stellar:

| Condition | Error / Status Code | Reported Fix | Description |
| --- | --- | --- | --- |
| **Pollar wallet still activating** | `SDK_WALLET_NOT_READY` | `WAIT_FOR_ACTIVATION` | The account has been provisioned by Pollar but is awaiting on-chain ledger confirmation. The UI displays an activating state rather than prompting for funds. |
| **Unsponsored / standard wallet missing** | `ACCOUNT_NOT_FOUND` | `FUND_XLM` | The account does not exist on Stellar and requires initial funding (e.g. via Friendbot on testnet). |

---

## 4. Troubleshooting Guide

### 1. `readiness: { usdcTrustline: { ok: false } }` / `fix: 'ADD_TRUSTLINE'`
- **Cause**: The Pollar dashboard has the default mainnet USDC issuer (`GA5Z...`), has not added the testnet USDC asset, or the wallet was created before the testnet USDC asset was configured (so it missed Pollar's onboarding `changeTrust` step).
- **Fix**:
  - **Dashboard**: Add asset `USDC` with issuer `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` in the Pollar Dashboard so newly onboarded wallets receive the trustline automatically.
  - **Recovery for existing wallets**: The app exposes `POST /api/escrow/readiness/trustline` (escrow router `/readiness/trustline`), which returns an unsigned `changeTrust` XDR (`{ unsignedXdr }`) for the registered wallet to sign and submit to Horizon. Because client-side XDR signing with Pollar is not yet supported (`PollarSigningUnsupportedError`), an existing Pollar wallet cannot sign this `changeTrust` transaction directly—connect a supported signing wallet (e.g. Freighter) to sign, or re-onboard a wallet after configuring the dashboard trustline.

### 2. `readiness: { xlmForFees: { ok: false, fix: 'FUND_XLM' } }`
- **Cause**: The wallet is not identified as a sponsored Pollar wallet in `user_wallets` (`provider: 'pollar'`), or fee sponsorship is disabled in the dashboard.
- **Fix**: Verify `provider: 'pollar'` was saved during `activate-wallet`, and verify sponsorship is active in Pollar.

### 3. `SDK_CREDITS_INSUFFICIENT`
- **Cause**: The Pollar application's credit balance for sponsoring transactions has been exhausted.
- **Fix**: Refill credits in Pollar Dashboard → **Billing & Credits** or ensure the custom gas wallet has sufficient testnet XLM.

### 4. `SDK_WALLET_NOT_READY`
- **Cause**: An escrow action was initiated before Pollar completed account activation and trustline setup on the ledger.
- **Fix**: Wait 2–5 seconds for ledger confirmation, then click the checklist's refresh button or reload the page. The readiness checklist does not refresh automatically on its own.

