# Escrow Lifecycle

A SafeTrust escrow moves through six states from creation to fund release.
All state transitions are initiated via `apps/api` and mirrored to the
Stellar blockchain through TrustlessWork.

## State machine

```mermaid
stateDiagram-v2
    [*] --> pending_signature : POST /api/escrow/deploy
    pending_signature --> funded : POST /api/escrow/fund
    funded --> milestone_approved : POST /api/escrow/approve-milestone
    milestone_approved --> released : POST /api/escrow/release-funds
    funded --> disputed : POST /api/escrow/dispute
    disputed --> released : POST /api/escrow/resolve-dispute
    released --> [*]
```

## Step-by-step flow

```mermaid
sequenceDiagram
    participant Guest
    participant Frontend
    participant API
    participant TW as TrustlessWork
    participant Stellar

    Guest->>Frontend: Clicks "Book" on apartment
    Frontend->>API: POST /api/escrow/deploy
    API->>API: checkIdempotency(engagementId)
    API->>TW: POST /deployer/single-release
    TW->>Stellar: Deploy Soroban contract
    Stellar-->>TW: contractId + unsignedXDR
    TW-->>API: { contractId, unsignedXDR }
    API->>API: INSERT escrows (status: pending_signature)
    API-->>Frontend: { unsignedXDR, engagementId }
    Frontend->>Guest: Freighter signs XDR
    Guest->>Frontend: Signed XDR
    Frontend->>API: POST /api/escrow/fund
    API->>TW: Submit signed transaction
    TW->>Stellar: Fund contract
    Stellar-->>TW: tx confirmed
    API->>API: UPDATE escrows (status: funded)
    API-->>Frontend: { status: funded }
    Frontend-->>Guest: "Booking confirmed"
```

## Idempotency

Every deploy request is guarded by `checkIdempotency(engagementId)` before
reaching TrustlessWork. Through the `safetrust` Hasura source, the guard queries
the `engagement_id` column on `public.escrows` (`public` is the PostgreSQL
schema) and short-circuits with `{ cached: true }` if a row already exists.
This prevents double-click PAY from creating two on-chain escrows before the DB
constraint can fire.

## Roles in escrow contract

| Role | Assigned to | Responsibility |
|---|---|---|
| `approver` | Guest (senderAddress) | Signs milestone approval |
| `serviceProvider` | Host (receiverAddress) | Delivers the service |
| `receiver` | Host (receiverAddress) | Receives funds on release |
| `releaseSigner` | Guest (senderAddress) | Authorizes fund release |
| `disputeResolver` | SafeTrust platform | Resolves disputes |
| `platformAddress` | SafeTrust treasury | Receives platform fee |
