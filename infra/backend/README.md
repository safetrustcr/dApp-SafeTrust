# Hasura Backend

## Bootstrap

| Step | Command | Purpose |
|------|---------|---------|
| 1 | `bin/start safetrust hotel_industry` | Start containers, run migrations, deploy metadata, apply seeds |
| 2 | `bin/generate-init-sql` | Re-generate `init/*.sql` from migrations (run after adding a new migration) |
| 3 | `bin/deploy-init` | Apply `init/*.sql` directly via psql (fast-path, no Hasura CLI needed) |

### Environment Variables

Copy `.env.example` to `.env` and fill in required values:

```bash
cp .env.example .env
```

### Quick Start

```bash
cd infra/backend
bin/start safetrust hotel_industry
```

### Init SQL Fast-Path (CI / cold start)

```bash
cd infra/backend
# Generate or regenerate init SQL from migrations
bin/generate-init-sql

# Deploy directly via psql (requires psql client)
bin/deploy-init
```

> [!WARNING]
> `bin/deploy-init` applies raw SQL directly via `psql` and does **not** update Hasura's `hdb_catalog.schema_migrations` tracking table.
>
> Running `bin/start` against a database initialized via the fast path will attempt to re-run migrations from step 1 and **fail** due to conflicting existing schema objects.
>
> **Supported Follow-up Procedure:**
> - If using `bin/deploy-init`, do not invoke `bin/start` on the same database.
> - To apply Hasura metadata and seeds after fast-path deployment, apply metadata/seeds directly via Hasura CLI without running migrations.
> - To use standard `bin/start` migration workflows, reset/wipe the database first before invoking `bin/start`.
