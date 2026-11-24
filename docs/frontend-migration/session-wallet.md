# Session & Wallet Capability Matrix

This document defines the single owner for each authentication, role, and wallet concern across the SafeTrust dApp.
New UI components interface with these concerns through defined adapters (`useWalletBridge`, `useSessionView`) and never talk to Firebase or raw wallet SDKs directly.

## Capability Matrix

| Concern | Owner in the dApp | New UI uses |
|---|---|---|
| Firebase user + ID token | `lib/firebase.ts` | `useSessionView()` |
| Roles (guest / host / admin / hotel_manager) | Hasura claims + `lib/middleware/roles.ts` | `useSessionView().roles` |
| Pollar login + wallet | `components/auth/pollar/*` | `useWalletBridge()` |
| Freighter / wallets kit | `use-active-wallet.ts`, `use-freighter.ts` | `useWalletBridge()` |
| Sign XDR | `use-active-wallet.ts` | `useWalletBridge().sign(xdr)` |
| Register → sync-user → claims refresh | `lib/auth/register-user.ts` | form `onSubmit` calls it |

## Architectural Rules

1. **Single Source of Truth:**
   - Session tokens and user identity belong solely to Firebase Authentication (`lib/firebase.ts`).
   - Wallet connection metadata is strictly for transaction signing (`use-active-wallet.ts`). Connecting a wallet **never** signs anyone in or grants a role.
2. **Authorization & Registration (#443):**
   - Escrow actions require a registered primary wallet in `public.user_wallets`.
   - `isRegistered` status is verified directly against the API, never inferred from local storage.
3. **Wallet Signing Guarantees:**
   - XDR transactions are built by the SafeTrust API and verified on-chain.
   - User rejections and cancellations throw `WalletRejectedError` with clean teardown (no half-done state).
