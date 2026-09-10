# Bootstrap Guide

Get SafeTrust running locally from scratch.

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 20+ | Runtime |
| pnpm | 9+ | Package manager |
| Docker Engine CE | 24+ | Hasura + PostgreSQL |
| Hasura CLI | latest | Migrations + metadata |

> **Docker note:** Use Docker Engine CE (native Linux), not Docker Desktop.
> Docker Desktop uses QEMU emulation which causes OOM crashes under load.
> See [infra/docker.md](./docker.md) for migration steps.

## 1. Clone and install

```bash
git clone https://github.com/safetrustcr/dApp-SafeTrust.git
cd dApp-SafeTrust
git checkout consolidation-pattern
pnpm install
```

## 2. Configure environment variables

```bash
# apps/api
cp apps/api/.env.example apps/api/.env
# Fill in:
#   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
#   TRUSTLESS_WORK_API_KEY
#   POLLAR_SECRET_KEY (optional)

# apps/frontend
cp apps/frontend/.env.example apps/frontend/.env.local
# Fill in:
#   NEXT_PUBLIC_API_URL=http://localhost:3002
#   NEXT_PUBLIC_HASURA_GRAPHQL_URL=http://localhost:8080/v1/graphql
#   NEXT_PUBLIC_FIREBASE_* (from Firebase Console → Project Settings)
```

## 3. Start the backend infrastructure

```bash
cd infra/backend
bin/start safetrust hotel_industry
```

This command:
1. Starts PostgreSQL and Hasura via Docker Compose
2. Applies migrations for both tenants
3. Applies Hasura metadata
4. Outputs service URLs when ready

Expected output:
```
✅ SafeTrust backend ready
   Tenants deployed: safetrust hotel_industry
   GraphQL:          http://localhost:8080/v1/graphql
   PostgreSQL:       localhost:5433
   API:              http://localhost:3002
```

## 4. Start the development server

```bash
cd ../..   # back to repo root
pnpm dev
```

This starts:
- `apps/api` on port 3002
- `apps/frontend` on port 3001

Open `http://localhost:3001`.

## 5. Verify

```bash
# API health
curl http://localhost:3002/health
# → { "status": "ok" }

# Hasura GraphQL
curl http://localhost:8080/healthz
# → OK

# Run tests
pnpm test
# → all packages passing
```

## Common issues

| Symptom | Fix |
|---|---|
| `bin/start` fails with metadata error | Always start both tenants: `bin/start safetrust hotel_industry` |
| `HASURA_ADMIN_SECRET not set` | Add `HASURA_ADMIN_SECRET=myadminsecretkey` to `apps/api/.env` |
| `Failed to promote user to host` | Seed the roles table: run `07_roles_seed.sql` in Hasura console |
| `usePollar must be used inside PollarProvider` | Add `PollarProvider` to `apps/frontend/src/app/layout.tsx` |