# Data Model

SafeTrust uses PostgreSQL with two schemas managed by Hasura: `safetrust`
(core platform) and `hotel_industry` (hospitality vertical).

## Core entity relationships

```mermaid
erDiagram
    users {
        string id PK
        string email
        string first_name
        string last_name
        string phone_number
        string country_code
        string location
        timestamp last_seen
    }
    user_wallets {
        uuid id PK
        string user_id FK
        string wallet_address
        string chain_type
        boolean is_primary
        string provider
    }
    user_roles {
        uuid id PK
        string user_id FK
        int role_id FK
    }
    roles {
        int id PK
        string name
    }
    apartments {
        uuid id PK
        string owner_id FK
        string title
        numeric price_per_night
        string location
    }
    escrows {
        uuid id PK
        string engagement_id
        string contract_id
        uuid apartment_id FK
        string sender_address
        string receiver_address
        numeric amount
        string status
        string tenant_id
    }
    trustless_work_escrows {
        uuid id PK
        string contract_id
        string engagement_id
        string status
        numeric amount
        timestamp created_at
    }
    escrow_milestones {
        uuid id PK
        uuid escrow_id FK
        string title
        numeric amount
        string status
        int milestone_index
    }

    users ||--o{ user_wallets : "has"
    users ||--o{ user_roles : "has"
    roles ||--o{ user_roles : "defines"
    users ||--o{ apartments : "owns"
    apartments ||--o{ escrows : "has"
    escrows ||--o{ escrow_milestones : "has"
    trustless_work_escrows ||--o{ escrow_milestones : "mirrors"
```

## Three-layer escrow hierarchy

```mermaid
graph TD
    TW["trustless_work_escrows\nBlockchain mirror\ncontract_id · status · amount"]
    M["escrow_milestones\nRelease schedule\ntitle · amount · milestone_index"]
    E["escrows\nSafeTrust business log\nengagement_id · sender · receiver · tenant_id"]

    TW --> M
    E --> M
```

Every escrow write follows this hierarchy:
1. `trustless_work_escrows` — mirrors the on-chain Soroban contract state
2. `escrow_milestones` — defines the release schedule and tracks per-milestone status
3. `escrows` — SafeTrust business context (who, what property, which tenant)

## Key constraints

| Table | Constraint | Purpose |
|---|---|---|
| `escrows` | `UNIQUE(engagement_id)` | Idempotency guard — prevents double-deploy |
| `user_roles` | `UNIQUE(user_id, role_id)` | Idempotent promote-to-host |
| `user_wallets` | `UNIQUE(wallet_address)` | One wallet entry per address |
| `users` | `UNIQUE(email)` | Firebase UID upsert anchor |

## Roles

The `roles` table is seeded with three entries:

| id | name |
|---|---|
| 1 | guest |
| 2 | host |
| 3 | admin |

Roles are assigned via `user_roles`. A user may hold multiple roles —
the middleware resolves the highest privilege: `admin > host > guest`.