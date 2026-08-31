# Wallet integration

This document describes the SafeTrust wallet abstraction for the frontend, including the unified `useActiveWallet()` hook, the Freighter flow, the Pollar embedded wallet flow, and how the `is_primary` flag decides which wallet is used for signing.

## 1) `useActiveWallet()` hook API

The main abstraction is `apps/frontend/src/hooks/use-active-wallet.ts`.

```ts
const { address, walletType, isReady, signAndSubmit } = useActiveWallet();
```

### Return shape

```ts
type ActiveWalletResult = {
  address: string | null;
  walletType: 'freighter' | 'pollar' | null;
  isReady: boolean;
  signAndSubmit: (unsignedXdr: string) => Promise<{ txHash: string }>;
};
```

### Selection logic

The hook resolves the active wallet in this order:

1. If the Freighter address exists, use it as the active wallet.
2. Otherwise, if the Pollar wallet is authenticated, use the Pollar address.
3. Otherwise, no wallet is connected.

```ts
const address = freighterAddress || pollarAddress;
const walletType = freighterAddress ? 'freighter' : pollarAddress ? 'pollar' : null;
```

This means Freighter wins if both connections exist. The app intentionally prefers the wallet that already has a real Stellar signing session in the browser.

### Signing behavior

`signAndSubmit()` dispatches based on the active provider:

- `freighter`: calls `signXDR()` from the wallet hook, then POSTs the signed XDR to `/api/escrow/send-transaction`
- `pollar`: asks the Pollar client to build and sign the transaction directly

This lets the UI hide wallet-specific logic behind a single API.

## 2) Freighter integration

Freighter support is built around `useWallet()` in `apps/frontend/src/components/auth/wallet/hooks/wallet.hook.ts`.

### Connection flow

The wallet kit is initialized from the project wallet constants, then the user selects a wallet in a modal. On success:

```ts
const { address } = await kit.getAddress();
connectWalletStore(address, name);
```

### XDR signing

Freighter signing uses the `@stellar/freighter-api` package:

```ts
const { signedTxXdr } = await signTransaction(unsignedXDR, {
  address,
  networkPassphrase: networkPassphrase || WalletNetwork.TESTNET,
});
```

The signed XDR is returned and then submitted to the backend transaction route.

### Why the app still uses the backend route

The browser does not submit the raw transaction directly to the blockchain. Instead, the signed XDR is sent to the backend endpoint:

```ts
fetch(`${apiUrl}/api/escrow/send-transaction`, {
  method: 'POST',
  body: JSON.stringify({ signedXdr }),
});
```

This keeps blockchain submission logic, secret-bearing environment variables, and server-side orchestration away from the browser bundle.

## 3) Pollar integration

The embedded wallet provider is based on `@pollar/react` and is wrapped in `apps/frontend/src/components/auth/pollar/PollarProvider.tsx`.

```tsx
export function PollarProvider({ children }: { children: ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY;

  if (!apiKey) {
    return <PollarWalletContext.Provider value={{ configured: false }}>{children}</PollarWalletContext.Provider>;
  }

  return (
    <SdkPollarProvider client={{ apiKey }}>
      <PollarAddressBridge>{children}</PollarAddressBridge>
    </SdkPollarProvider>
  );
}
```

### Embedded-wallet setup

- `NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY` is the public client key that enables embedded wallet mode.
- If the key is missing, the app still renders and simply disables the Pollar path instead of crashing.
- `usePollarWallet()` exposes the current wallet address through context.

### Auth activation flow

`usePollarWalletSync()` listens for a connected Pollar address and, when the user already has a Firebase token, calls the backend:

```ts
fetch(`${apiUrl}/api/auth/activate-wallet`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
});
```

The backend route in `apps/api/src/routes/auth/activate-wallet.handler.js` does the Pollar activation and writes the result to Hasura.

### LATAM / embedded wallet motivation

The Pollar integration is meant to support easier embedded wallet onboarding for Latin American users who may not already have a browser wallet extension installed. This is a complementary flow to Freighter rather than a replacement for it.

## 4) `is_primary` wallet flag

The backend activation route writes a wallet row to `public.user_wallets` like this:

```graphql
insert_user_wallets_one(
  object: {
    user_id: $userId
    wallet_address: $address
    chain_type: "STELLAR"
    is_primary: true
    provider: "pollar"
  }
  on_conflict: {
    constraint: unique_wallet_address
    update_columns: [is_primary, provider]
  }
)
```

This is the important rule:

- `is_primary: true` marks the wallet that should be considered the user’s active signer for the current identity context
- when there are multiple wallet rows, the app prefers the first wallet that resolves as a valid active Stellar address
- the frontend `useActiveWallet()` chooses `freighter` over `pollar` when both are available

This is why the backend sets `provider` and `is_primary` as part of the wallet activation process. It creates a canonical active wallet identity that downstream UI and escrow flows can rely on.

## 5) Wallet in escrow deploy

The escrow flow starts in `EscrowPayFlow.tsx`.

```ts
const { address, walletType, isReady, signAndSubmit } = useActiveWallet();
```

When the user clicks pay, the app deploys the escrow by POSTing the selected `senderAddress`:

```ts
fetch(`${baseUrl}/api/escrow/deploy`, {
  method: 'POST',
  body: JSON.stringify({
    apartmentId,
    senderAddress: address,
    receiverAddress: ownerWalletAddress,
    amount,
  }),
});
```

This is the key integration point: the wallet address becomes the escrow sender.

After deployment, the app receives an unsigned XDR and calls:

```ts
await signAndSubmit(deployState.unsignedXDR);
```

That function then either:

- signs with Freighter and submits via `/api/escrow/send-transaction`, or
- asks the Pollar client to build and sign the transaction directly

In other words, the escrow backend receives a valid signed Stellar transaction, but the frontend never needs to know whether the signer came from Freighter or Pollar.

## Summary

The wallet layer is intentionally abstracted behind a single hook:

- `useActiveWallet()` hides provider differences
- Freighter remains the primary browser wallet path
- Pollar is an embedded-wallet alternative for guest onboarding and LATAM use cases
- `is_primary` determines the canonical wallet for identity and signing
- escrow creation and signing always pass the current active address as `senderAddress` or a signed XDR payload

That abstraction keeps the rest of the app mostly provider-agnostic while still allowing each wallet implementation to present its own signing semantics.
