# Wallet Integration

SafeTrust supports two Stellar wallet providers: Freighter (browser
extension) for global users and Pollar (embedded) for LATAM users.

## Wallet decision flow

```mermaid
flowchart TD
    Start["User needs a wallet"]
    HasFreighter{"Freighter\ninstalled?"}
    Freighter["Connect Freighter\nG-address from extension"]
    HasPollar{"POLLAR_SECRET_KEY\nconfigured?"}
    Pollar["Activate Pollar wallet\nPOST /api/auth/activate-wallet"]
    NoWallet["Show setup guide"]

    Start --> HasFreighter
    HasFreighter -->|Yes| Freighter
    HasFreighter -->|No| HasPollar
    HasPollar -->|Yes| Pollar
    HasPollar -->|No| NoWallet
```

## Freighter integration

Freighter is a browser extension wallet for Stellar. SafeTrust uses
`@stellar/freighter-api` to request the public key and sign XDR transactions.

```typescript
// Connect
const { address } = await getAddress();

// Sign escrow transaction
const { signedTxXdr } = await signTransaction(unsignedXDR, {
  networkPassphrase: Networks.TESTNET,
});
```

After connecting, the address is synced to the DB:
```
POST /api/auth/sync-wallet
{ walletAddress, chainType: 'STELLAR', isPrimary: true, provider: 'freighter' }
```

## Pollar integration

Pollar provisions an embedded Stellar wallet server-side for users who
cannot install browser extensions (mobile, restricted environments).

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Pollar

    User->>Frontend: "Connect Pollar Wallet"
    Frontend->>API: POST /api/auth/activate-wallet\nBearer {idToken}
    API->>Pollar: POST /v2/wallet/activate { userId }
    Pollar-->>API: { address: "G..." }
    API->>API: INSERT user_wallets (provider: pollar, is_primary: true)
    API-->>Frontend: { address, walletId }
```

`PollarProvider` must be present in `app/layout.tsx` for `usePollar()` to
work in the `useActiveWallet()` hook.

## useActiveWallet hook

The `useActiveWallet()` hook abstracts the wallet provider choice:

```typescript
const { address, signTransaction, provider } = useActiveWallet();
// address: G... (from whichever provider is active)
// provider: 'freighter' | 'pollar'
// signTransaction: (xdr: string) => Promise<string>
```

The `is_primary` flag in `public.user_wallets` determines which wallet
is the active signer for escrow transactions. A partial unique index enforces
at most one primary wallet per user. Both wallet upsert paths demote the user's
current primary and promote the selected wallet in one Hasura mutation, so the
change is atomic.

## Signing transport and network

`WalletBridge.sign` is the XDR signing entry point. The persisted
`walletProvider` records the selected transport separately from the display name
and `stellarWalletId`: direct Freighter uses its adapter, while Freighter chosen
inside Stellar Wallets Kit stays on the Kit adapter. Older sessions without the
transport field retain the legacy resolution until the user reconnects.

Selecting Pollar clears the previous signing selection before starting its
asynchronous login. Once the SDK supplies an address, the bridge stores it only
if Pollar is still selected. Pollar XDR signing remains explicitly unsupported;
neither an earlier Kit selection nor an installed extension is used as fallback.

Escrow build/deploy responses include the API verifier's public
`networkPassphrase`, including cached unsigned transactions. The frontend passes
it to the selected signing adapter and still submits escrow XDR exclusively to
`/api/escrow/send-transaction`. Client-side provider metadata never grants server
authorization or changes the server's expected signer, pending action or network.

## Wallet address storage

```sql
-- user_wallets schema
id             uuid PRIMARY KEY
user_id        text REFERENCES users(id)
wallet_address text UNIQUE
chain_type     text  -- always 'STELLAR'
is_primary     bool
provider       text  -- 'freighter' | 'pollar' | 'albedo'

UNIQUE (user_id) WHERE is_primary IS TRUE
```

Upsert uses `ON CONFLICT (wallet_address) DO UPDATE SET is_primary, provider`
— connecting the same wallet twice is idempotent. Queries that select an
escrow signer order primary wallets by `updated_at DESC, id ASC` before applying
`limit: 1` for deterministic behavior.
