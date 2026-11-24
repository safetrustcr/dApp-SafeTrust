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
INIT_FAST_PATH=1 bin/start safetrust
```

> [!WARNING]
> The fast path is for a brand-new, empty database only. `bin/deploy-init` refuses to run when application tables already exist and marks the snapshot migrations as applied with `--skip-execution`.
>
> Running `bin/start` against a database initialized via the fast path will attempt to re-run migrations from step 1 and **fail** due to conflicting existing schema objects.
>
> **Supported Follow-up Procedure:**
> - `bin/start` remains the canonical migration path for existing databases.
> - Run `bin/smoke-test safetrust` after either path to verify Hasura and API health.
> - To use standard `bin/start` migration workflows, reset/wipe the database first before invoking `bin/start`.
