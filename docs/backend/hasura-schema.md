# Hasura Schema

Hasura provides the GraphQL read API and event trigger pipeline for SafeTrust.
It connects to PostgreSQL and exposes two tenant sources.

## Source configuration

```mermaid
graph TD
    Hasura["Hasura GraphQL Engine\nport 8080"]
    ST["Source: safetrust\npostgres://postgres@postgres:5432/postgres"]
    HI["Source: hotel_industry\npostgres://postgres@postgres:5432/postgres"]
    PG["PostgreSQL\nport 5433"]

    Hasura --> ST
    Hasura --> HI
    ST --> PG
    HI --> PG
```

Both sources connect to the same PostgreSQL instance but expose different
schema views and table permissions.

## safetrust source tables

| Table | Description |
|---|---|
| `public.users` | Registered users — id is Firebase UID (TEXT) |
| `public.user_wallets` | Stellar wallet addresses per user |
| `public.user_roles` | Many-to-many: users ↔ roles |
| `public.roles` | Role definitions: guest, host, admin |
| `public.apartments` | Rental listings owned by hosts |
| `public.escrows` | SafeTrust escrow business records |
| `public.trustless_work_escrows` | On-chain escrow mirror |
| `public.escrow_milestones` | Per-escrow milestone schedule |
| `public.trustless_work_webhook_events` | TrustlessWork event log |

## hotel_industry source tables

Every hotel table lives in the `hotel_industry` PostgreSQL schema — there is
no `public.hotels`. See `docs/architecture/multi-tenant.md` for the full
root-field naming contract (some of these are exposed under a `hotel_`-
prefixed root field to avoid colliding with safetrust's own `users` and
`escrow_transactions` tables).

| Table | Description |
|---|---|
| `hotel_industry.users` | Hotel-tenant users — guests, staff, managers |
| `hotel_industry.hotels` | Hotel properties, owned by a `hotel_industry.users` row |
| `hotel_industry.rooms` | Rooms within hotels |
| `hotel_industry.room_types` | Room category definitions |
| `hotel_industry.room_images` | Room photo references |
| `hotel_industry.reservations` | Booking records |
| `hotel_industry.escrow_transactions` | Escrow records for hotel bookings |
| `hotel_industry.escrow_transaction_users` | User associations per escrow |
| `hotel_industry.pricing_rules` | Dynamic pricing rules |
| `hotel_industry.users_wallets` | Tenant-scoped wallet records |

## Event triggers

Hasura sends HTTP event callbacks to `apps/api` when data changes.
The `WEBHOOK_URL` environment variable points to the API:

```
WEBHOOK_URL=http://safetrust-api:3002   # Docker Compose (internal network)
WEBHOOK_URL=http://host.docker.internal:3002  # Local pnpm dev
```

## Migrations

Migrations are managed per tenant in:

```
infra/backend/migrations/
├── safetrust/       ← safetrust schema migrations
└── hotel_industry/  ← hotel_industry schema migrations
```

Apply with:
```bash
cd infra/backend
hasura migrate apply \
  --database-name safetrust \
  --endpoint http://localhost:8080 \
  --admin-secret myadminsecretkey
```

## Metadata

```
infra/backend/metadata/
├── base/            ← Shared config (actions, network, opentelemetry)
└── tenants/
    ├── safetrust/   ← safetrust table tracking + relationships
    └── hotel_industry/  ← hotel_industry table tracking + relationships
```

The `build-metadata.sh` script merges base + tenant metadata before applying.