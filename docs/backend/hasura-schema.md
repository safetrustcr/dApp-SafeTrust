# SafeTrust Hasura GraphQL Schema

Reference for the Hasura GraphQL engine in `infra/backend` that powers the
frontend's data layer. The API is multi-tenant: two Postgres **sources** are
tracked against the same `PG_DATABASE_URL`.

- GraphQL endpoint: `http://localhost:8080/v1/graphql` (also available via the
  `HASURA_GRAPHQL_URL` / `NEXT_PUBLIC_HASURA_GRAPHQL_URL` env vars).
- Everything under `infra/backend/metadata/` is merged from a shared `base/`
  plus per-tenant overrides by `build-metadata.sh`.

---

## Two sources and their tracked tables

Sources are declared in
`infra/backend/metadata/tenants/<tenant>/databases/databases.yaml`.

### `safetrust` source

Tables are tracked via `infra/backend/metadata/tenants/safetrust/databases/tables/tables.yaml`
(which `!include`s the per-table YAML files in the same directory):

| Table (schema `public`) | Metadata file |
|---|---|
| `users` | `public_users.yaml` |
| `user_wallets` | `public_user_wallets.yaml` |
| `roles` | `public_roles.yaml` |
| `user_roles` | `public_user_roles.yaml` |
| `apartments` | `public_apartments.yaml` |
| `escrows` | `public_escrows.yaml` |
| `trustless_work_escrows` | `public_trustless_work_escrows.yaml` |
| `escrow_milestones` | `public_escrow_milestones.yaml` |
| `trustless_work_webhook_events` | `public_trustless_work_webhook_events.yaml` |

### `hotel_industry` source

Declared inline in `databases/databases.yaml` (no separate `tables/` directory):

| Table | Schema |
|---|---|
| `hotels` | `public` |
| `rooms` | `public` |
| `reservations` | `public` |
| `pricing_rules` | `hotel_industry` |

> Every SafeTrust row carries `tenant_id = 'safetrust'` so both tenants can
> share one database.

---

## Key GraphQL queries

### `GET_ALL_APARTMENTS`

`apps/frontend/src/graphql/queries/apartment-queries.ts`

Lists available apartments (soft-deleted rows excluded via `deleted_at`, only
`is_available: true`) with pagination and an aggregate count:

```graphql
query GetAllApartments($limit: Int!, $offset: Int!) {
  apartments(
    limit: $limit
    offset: $offset
    where: { deleted_at: { _is_null: true }, is_available: { _eq: true } }
    order_by: { created_at: desc }
  ) { id name description price warranty_deposit is_available image_urls address available_from available_until owner_id }
  apartments_aggregate(
    where: { deleted_at: { _is_null: true }, is_available: { _eq: true } }
  ) { aggregate { count } }
}
```

Used by `GuestDashboard.tsx` and the guest suggestions page.

### `GET_ESCROW_BY_ANY_ID`

`apps/frontend/src/graphql/queries/escrow-queries.ts`

Fetches a single escrow by any of its identifiers (`id`, `engagement_id`, or
`contract_id`) plus nested tenant-wallet / apartment-owner data, and the
matching `trustlessWorkEscrows` row (camelCase fields `approver`, `marker`,
`releaser`, `resolver`):

```graphql
query GetEscrowByAnyId($id: uuid, $engagement_id: String, $contract_id: String) {
  escrows(where: { _or: [ { id: { _eq: $id } }, { engagement_id: { _eq: $engagement_id } }, { contract_id: { _eq: $contract_id } } ] }) {
    id contract_id engagement_id amount status created_at updated_at
    sender_address receiver_address resolution_notes
    tenant_wallet { user { id first_name last_name email phone_number country_code } }
    apartment { id name description image_urls price warranty_deposit address owner { id first_name last_name email phone_number country_code user_wallets(where: { is_primary: { _eq: true } }, limit: 1) { wallet_address } } }
  }
  trustlessWorkEscrows: trustlessWorkEscrows(where: { contractId: { _eq: $contract_id } }, limit: 1) {
    approver marker releaser resolver
  }
}
```

Used by `apps/frontend/src/app/apartment/[id]/escrow/[escrowId]/page.tsx`.

### `GetUserRoles` (middleware)

`apps/frontend/src/lib/middleware/fetch-user-role.ts`

The Next.js middleware resolves a user's effective role by fetching **all**
role assignments (no limit — a user promoted guest → host holds two rows, and
`limit: 1` could return the wrong one) and picking the highest-privilege role:

```graphql
query GetUserRoles($uid: String!) {
  user_roles(where: { user_id: { _eq: $uid } }) {
    role { name }
  }
}
```

Fails open to `guest` on any error so a role lookup outage can never lock a user
out. Valid roles are `guest`, `host`, `admin` (see
`apps/frontend/src/lib/middleware/roles.ts`).

---

## Metadata build system

All scripts live in `infra/backend/metadata/` and require the Hasura CLI and
`yq` (Mike Farah) installed.

### `build-metadata.sh`

```bash
./build-metadata.sh                       # build all tenants
./build-metadata.sh safetrust             # build one tenant
```

Merges the shared `metadata/base` with `metadata/tenants/<tenant>` by deep-
merging YAML (tenant files override `base`), writing the result to
`metadata/build/<tenant>/`.

### `deploy-tenant.sh`

```bash
./deploy-tenant.sh safetrust
./deploy-tenant.sh safetrust --admin-secret SECRET --endpoint http://localhost:8080
```

Requires a `metadata/build/<tenant>` (run `build-metadata.sh` first). Registers
the Postgres source if missing (`pg_add_source`), then applies full metadata
with permissions, relationships, and row-level filters via `hasura metadata
apply`.

### `setup-tenant.sh`

```bash
./setup-tenant.sh safetrust
./setup-tenant.sh safetrust --admin-secret SECRET --endpoint http://localhost:8080
```

Runs `build-metadata.sh` then `deploy-tenant.sh` for one tenant in a single
command.

> In normal local development you rarely run these directly — `bin/start`
> (`infra/backend/bin/start`) orchestrates the whole flow: docker up → wait for
> health → register sources → `hasura migrate apply` → setup-tenant → send
> transaction → reload metadata → apply seeds.

---

## Opening the Hasura console

```bash
hasura console --endpoint http://localhost:8080 --admin-secret myadminsecretkey
```

Runs the browser console against the local Hasura instance (defaults shown in
`infra/backend/bin/start`).

---

## Reloading metadata

```bash
hasura metadata reload --endpoint http://localhost:8080 --admin-secret myadminsecretkey
```

`bin/start` runs this automatically after deploy. Run it whenever you change
metadata files outside the deploy flow so the running engine picks up the
latest tracked schema.

---

## Metadata inconsistency fix

**What causes it:** An inconsistent/invalid metadata state — typically adding a
table, relationship, permission, or action whose referenced object (role,
source, table, column, or remote schema) does not yet exist or was removed.
Hasura reports these as `PG unavailable` / consistency errors and will refuse
to serve the affected GraphQL schema until resolved.

Common triggers in this repo:

- Deploying metadata before the tables exist (ordering matters — `bin/start`
  runs `migrate apply` **before** `metadata apply` for exactly this reason).
- Referencing a tracked table or relationship that isn't in the built metadata.

**How to resolve:**

1. Fix the underlying cause (apply migrations first, re-add the missing table /
   relationship, or correct the YAML).
2. Rebuild and redeploy the tenant metadata:

   ```bash
   ./build-metadata.sh safetrust
   ./deploy-tenant.sh safetrust --admin-secret myadminsecretkey
   ```

   or use `setup-tenant.sh` for the build+deploy in one call.
3. Reload the metadata and confirm consistency:

   ```bash
   hasura metadata reload --endpoint http://localhost:8080 --admin-secret myadminsecretkey
   ```

   In the console, the **Settings** tab shows the list of inconsistent objects;
   once the underlying object exists, reload resolves them.

---

## Admin secret note

The development admin secret is `myadminsecretkey`. It appears as a default in:

- `infra/backend/bin/start`
- `infra/backend/metadata/deploy-tenant.sh`
- `infra/backend/metadata/setup-tenant.sh`
- `infra/backend/.env.example` (`HASURA_GRAPHQL_ADMIN_SECRET`)

> ⚠️ **You MUST change this before any production deployment.** Use a long,
> random value and set it consistently via the `HASURA_GRAPHQL_ADMIN_SECRET`
> env var and `--admin-secret` flags. Never commit a real secret.
