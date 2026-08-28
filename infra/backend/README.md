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
cd infra/hasura
bin/start safetrust hotel_industry
```

### Init SQL Fast-Path (CI / cold start)

```bash
cd infra/hasura
# Generate or regenerate init SQL from migrations
bin/generate-init-sql

# Deploy directly via psql (requires psql client)
bin/deploy-init
```
