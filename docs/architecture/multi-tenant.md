# Multi-Tenant Design

SafeTrust serves two verticals from one PostgreSQL database using Hasura's
multi-source architecture. Each vertical is a separate Hasura logical source
pointing to the same database connection while exposing a tenant-specific table
set.

## Tenants

| Tenant | Hasura Source | Use Case |
| --- | --- | --- |
| `safetrust` | `safetrust` | P2P apartment rental escrow |
| `hotel_industry` | `hotel_industry` | Hotel booking escrow |

Both sources connect through the same `PG_DATABASE_URL` environment variable.
Isolation is logical: most tracked tables live in the `public` schema, while
`hotel_industry.pricing_rules` lives in the `hotel_industry` schema.

## Hasura Metadata Build System

Multi-tenant metadata is assembled by three scripts in
`infra/backend/metadata/`:

```text
metadata/
+-- base/                    # shared Hasura settings
+-- tenants/
|   +-- safetrust/
|   |   +-- databases/
|   |       +-- databases.yaml
|   |       +-- tables.yaml
|   |       +-- tables/      # per-table YAML files
|   +-- hotel_industry/
|       +-- databases/
|           +-- databases.yaml
|           +-- tables.yaml
|           +-- tables/      # per-table YAML files
+-- build-metadata.sh        # merges base + tenant into metadata/build/{tenant}/
+-- deploy-tenant.sh         # applies built metadata to Hasura via API
+-- setup-tenant.sh          # runs build + deploy for one or more tenants
```

`bin/start safetrust hotel_industry` calls `setup-tenant.sh` for both tenants
sequentially. Each tenant receives its own Hasura source, and Hasura tracks the
tables declared under `metadata/tenants/{tenant}/databases/tables/`.

The current tenant metadata tracks these table sets:

| Tenant | Tracked Tables |
| --- | --- |
| `safetrust` | `apartments`, `escrows`, `escrow_milestones`, `roles`, `trustless_work_escrows`, `trustless_work_webhook_events`, `users`, `user_roles`, `user_wallets` |
| `hotel_industry` | `escrow_transactions`, `escrow_transaction_users`, `hotels`, `hotel_industry.pricing_rules`, `reservations`, `rooms`, `room_images`, `room_types`, `user_wallets` |

## Bootstrap: Deploying Both Tenants

From `infra/backend`, deploy both tenants together:

```bash
cd infra/backend
bin/start safetrust hotel_industry
```

For fresh environments that should apply the prebuilt SQL init path directly,
use:

```bash
cd infra/backend
bin/deploy-init safetrust hotel_industry
```

`bin/start` starts the backend stack, runs tenant migrations, deploys Hasura
metadata, and applies seeds. `bin/deploy-init` is the fast SQL path and should
not be mixed with `bin/start` on the same database because it does not update
Hasura's migration tracking table.

Running only `bin/start safetrust` can leave the Hasura console with metadata
warnings because the `hotel_industry` source still references hotel tables that
have not been created.

## Tenant Routing in apps/api

`apps/api` uses the `X-Tenant-ID` header in
`apps/api/src/middleware/tenant.middleware.ts` to attach the selected tenant to
the request:

```ts
export const VALID_TENANTS = ['safetrust', 'hotel_industry'] as const;

// Header: X-Tenant-ID: hotel_industry
// req.tenant === 'hotel_industry' -> query hotel tables
// req.tenant === 'safetrust'      -> query rental escrow tables
```

If `X-Tenant-ID` is missing, the middleware defaults to `safetrust` for
backward compatibility. Invalid tenant IDs return HTTP 400 with the allowed
tenant list.

## Metadata Inconsistency: Common Issue

When Hasura metadata references tables that do not exist in PostgreSQL, the
console reports metadata inconsistency errors similar to:

```text
GraphQL Engine metadata is inconsistent with database
  - hotel_industry.pricing_rules: no such table/view in source
  - public.rooms: no such table/view in source
  - public.reservations: no such table/view in source
  - public.hotels: no such table/view in source
```

This usually means only the `safetrust` tenant was bootstrapped while the
`hotel_industry` metadata source was also present. Fix it by deploying both
tenants:

```bash
cd infra/backend
bin/start safetrust hotel_industry
```

For a fresh SQL-init environment, run:

```bash
cd infra/backend
bin/deploy-init safetrust hotel_industry
```

The hotel tenant currently has 12 migration folders under
`infra/backend/migrations/hotel_industry/`; those migrations create the hotel
tables referenced by Hasura metadata.

## Adding a New Tenant

1. Create migration folders in `infra/backend/migrations/{tenant_name}/`.
2. Create seed files in `infra/backend/seeds/{tenant_name}/`.
3. Create `infra/backend/metadata/tenants/{tenant_name}/databases/databases.yaml`.
4. Create `infra/backend/metadata/tenants/{tenant_name}/databases/tables.yaml`.
5. Add one YAML file per tracked table under `infra/backend/metadata/tenants/{tenant_name}/databases/tables/`.
6. Add `{tenant_name}` to `VALID_TENANTS` in `apps/api/src/middleware/tenant.middleware.ts`.
7. Run `bin/start {tenant_name}` from `infra/backend` to bootstrap that tenant.
