# Multi-Tenant Design

SafeTrust uses Hasura's multi-source feature to serve two tenants from a
single PostgreSQL database. `safetrust` and `hotel_industry` are Hasura source
names and tenant identifiers, not PostgreSQL schemas. Both use
`PG_DATABASE_URL`; most tables live in PostgreSQL's `public` schema, while only
`hotel_industry.pricing_rules` lives in the `hotel_industry` schema.

## Tenant topology

```mermaid
graph TD
    API["apps/api\nX-Tenant-ID header"]
    Hasura["Hasura GraphQL Engine"]
    ST["Hasura source: safetrust\ncore platform metadata"]
    HI["Hasura source: hotel_industry\nhospitality metadata"]
    DB["One PostgreSQL database\nPG_DATABASE_URL"]
    Public["PostgreSQL schema: public\nusers · escrows · apartments\nhotels · rooms · reservations"]
    Hotel["PostgreSQL schema: hotel_industry\npricing_rules only"]

    API -->|"X-Tenant-ID selects source"| Hasura
    Hasura --> ST
    Hasura --> HI
    ST --> DB
    HI --> DB
    DB --> Public
    DB --> Hotel
```

## Tenant middleware

Every request to `apps/api` passes through `tenantMiddleware` which reads
the `X-Tenant-ID` header and attaches the validated tenant to `req.tenant`:

```typescript
// Valid values
type Tenant = 'safetrust' | 'hotel_industry';

// Default when header is absent (backward compatible)
req.tenant = 'safetrust';
```

Requests with an invalid tenant value receive:
```json
{ "error": "Invalid X-Tenant-ID", "message": "Must be one of: safetrust, hotel_industry" }
```

## Metadata structure

```
infra/backend/metadata/
├── base/                   ← Shared Hasura config (actions, network, etc.)
└── tenants/
    ├── safetrust/
    │   └── databases/      ← safetrust source tables + relationships
    └── hotel_industry/
        └── databases/      ← hotel_industry source tables + relationships
```

The `bin/start` script runs `deploy-tenant.sh` for each tenant in sequence,
applying metadata and migrations. Always start both tenants together:

```bash
bin/start safetrust hotel_industry
```

Starting only `safetrust` leaves Hasura in an inconsistent metadata state
for the `hotel_industry` source.

## Handler routing by tenant

```typescript
// In any handler:
if (req.tenant === 'hotel_industry') {
  // query public.hotels and public.reservations through the hotel_industry source
} else {
  // query public.apartments and public.escrows through the safetrust source
}
```
