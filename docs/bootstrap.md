# Bootstrap Guide

From a fresh clone to a running development environment.

## Prerequisites

| Tool | Min version | Install |
|---|---|---|
| Docker + Docker Compose | latest | https://docs.docker.com/get-docker/ |
| Node.js | ≥ 18 | https://nodejs.org |
| pnpm | ≥ 8 | `npm install -g pnpm` |
| Hasura CLI | latest | `curl -L https://github.com/hasura/graphql-engine/releases/latest/download/cli-hasura-linux-amd64 -o /usr/local/bin/hasura && chmod +x /usr/local/bin/hasura` |

## Step 1 — Clone and install

```bash
git clone https://github.com/safetrustcr/dApp-SafeTrust
cd dApp-SafeTrust
git checkout consolidation-pattern
pnpm install
```

## Step 2 — Configure environment files

`apps/api/.env`
```env
PORT=3002
NODE_ENV=development
HASURA_GRAPHQL_URL=http://localhost:8080/v1/graphql
HASURA_ADMIN_SECRET=myadminsecretkey
TRUSTLESS_WORK_API_URL=https://dev.api.trustlesswork.com
TRUSTLESS_WORK_API_KEY= ← get from maintainer
FIREBASE_PROJECT_ID=safetrustcr-596e3
FIREBASE_CLIENT_EMAIL= ← from Firebase Console → Service Accounts
FIREBASE_PRIVATE_KEY= ← from Firebase Console → Service Accounts
POLLAR_SECRET_KEY= ← get from maintainer
```

`apps/frontend/.env.local`
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyATM5BPZL9oNYfxuuuE7phGYJkqMYictnM
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=safetrustcr-596e3.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=safetrustcr-596e3
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=safetrustcr-596e3.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=736891312580
NEXT_PUBLIC_FIREBASE_APP_ID=1:736891312580:web:2752bc815204c69fcbec91
NEXT_PUBLIC_HASURA_GRAPHQL_URL=http://localhost:8080/v1/graphql
NEXT_PUBLIC_BACKEND_URL=http://localhost:3002
NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY= ← get from maintainer
NEXT_PUBLIC_USE_HOTEL_MOCKS=true
HASURA_GRAPHQL_URL=http://localhost:8080/v1/graphql
HASURA_ADMIN_SECRET=myadminsecretkey
```

## Step 3 — Start the backend (Docker)

Two paths available:

**Tracked path (~45 seconds)** — use for normal development
```bash
cd infra/backend
bin/start safetrust hotel_industry
```
This applies migrations via Hasura CLI, deploys metadata, and seeds both tenants.
Hasura migration tracking (`hdb_catalog.schema_migrations`) is updated.

**Fast path (~8 seconds)** — use for CI or fresh Docker restarts
```bash
cd infra/backend
bin/deploy-init safetrust hotel_industry
```
Applies `init/safetrust.sql` and `init/hotel_industry.sql` via psql directly.
Does NOT update Hasura migration tracking — use for speed, not tracked state.

## Step 4 — Verify Hasura

Open [http://localhost:8080/console](http://localhost:8080/console)

Check Settings → Metadata Status — it should show consistent.
If you see "Inconsistent objects: rooms, hotels, reservations, pricing_rules", you only ran `bin/start safetrust`. Re-run with both tenants:
```bash
docker compose down -v
bin/start safetrust hotel_industry
```

## Step 5 — Start the apps

```bash
# From repo root (runs frontend + api + mcp via Turborepo)
pnpm run dev
```

Expected output:
```text
@safetrust/api:dev: [api] Server running on http://localhost:3002
@safetrust/mcp:dev: [safetrust-mcp] server running on stdio
@safetrust/web:dev: ✓ Ready in 2.5s (http://localhost:3001)
```

## Step 6 — Verify

| URL | Expected |
|---|---|
| [http://localhost:3001](http://localhost:3001/) | SafeTrust login page |
| [http://localhost:3001/register](http://localhost:3001/register) | Registration form with DEV ONLY role selector |
| [http://localhost:3002/health](http://localhost:3002/health) | `{ status: 'ok' }` |
| [http://localhost:8080/console](http://localhost:8080/console) | Hasura console, consistent metadata |

## Common Errors

**Error: listen EADDRINUSE :::3001**
Port 3001 or 3002 is already in use from a previous session:
```bash
lsof -ti:3001 | xargs kill -9
lsof -ti:3002 | xargs kill -9
pnpm run dev
```

**[sync-user] TypeError: Failed to parse URL from undefined**
`HASURA_GRAPHQL_URL` is not set in `apps/api/.env`:
```bash
echo "HASURA_GRAPHQL_URL=http://localhost:8080/v1/graphql" >> apps/api/.env
echo "HASURA_ADMIN_SECRET=myadminsecretkey" >> apps/api/.env
```

**fetchUserRole: failed to reach Hasura [TimeoutError]**
Hasura is not running. Start Docker first:
```bash
cd infra/backend && bin/start safetrust hotel_industry
```

**Error: usePollar must be used inside <PollarProvider>**
`PollarProvider` is missing from `apps/frontend/src/app/layout.tsx`. Add it wrapping `TrustlessWorkProvider`. See `frontend/wallet-integration.md`.

**Hasura health check timed out after 120s**
Docker is pulling images for the first time. Wait for pull to complete:
```bash
docker compose pull # pre-pull explicitly
bin/start safetrust hotel_industry
```
