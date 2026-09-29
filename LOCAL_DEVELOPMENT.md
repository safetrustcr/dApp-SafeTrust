# Local Development Guide

This guide walks you through configuring and running dApp-SafeTrust on your local machine.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Repository Setup](#repository-setup)
- [Environment Variables](#environment-variables)
- [Firebase Setup](#firebase-setup)
- [TrustlessWork API Key](#trustlesswork-api-key)
- [Database Setup](#database-setup)
- [Local Services](#local-services)
- [Running the Applications](#running-the-applications)
- [Running Tests](#running-tests)
- [Common Development Commands](#common-development-commands)
- [Service Port Reference](#service-port-reference)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Install the following tools before continuing.

| Tool | Minimum Version | Notes |
|---|---|---|
| [Node.js](https://nodejs.org) | ≥ 18.17.0 | LTS recommended |
| [pnpm](https://pnpm.io) | ≥ 8 | Workspace package manager |
| [Docker](https://docs.docker.com/get-docker/) | latest | Required for Postgres + Hasura |
| [Docker Compose](https://docs.docker.com/compose/) | latest | Bundled with Docker Desktop |
| [Hasura CLI](https://hasura.io/docs/latest/hasura-cli/install-hasura-cli/) | latest | Applies migrations and metadata |
| [Freighter Wallet](https://www.freighter.app/) | latest | Browser extension for Stellar signing |

Install pnpm and the Hasura CLI globally:

```bash
npm install -g pnpm hasura-cli
```

Verify versions:

```bash
node -v        # v18.x or higher
pnpm -v        # 8.x or higher
docker -v
hasura version
```

---

## Repository Setup

```bash
# Clone the repository
git clone https://github.com/safetrustcr/dApp-SafeTrust.git
cd dApp-SafeTrust

# Install all workspace dependencies from the repo root
pnpm install
```

> Always run `pnpm install` from the **repo root**. The `workspace:*` protocol used by shared packages only resolves correctly from there.

---

## Environment Variables

The project has three separate `.env` files — one per application layer. Copy and fill in each one before starting any service.

### 1. Frontend — `apps/frontend/.env.local`

```bash
cp apps/frontend/.env.example apps/frontend/.env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web app API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |
| `NEXT_PUBLIC_HASURA_GRAPHQL_URL` | Hasura GraphQL endpoint (default: `http://localhost:8080/v1/graphql`) |
| `HASURA_GRAPHQL_URL` | Server-side Hasura URL — keeps the admin secret off the client bundle |
| `HASURA_ADMIN_SECRET` | Hasura admin secret (default: `myadminsecretkey`) |
| `NEXT_PUBLIC_BACKEND_URL` | API service URL (default: `http://localhost:3002`) |
| `NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY` | Pollar embedded wallet publishable key (safe to expose) |
| `NEXT_PUBLIC_USE_HOTEL_MOCKS` | Set to `true` to use mock hotel data without live Hasura tables |

### 2. API — `apps/api/.env`

```bash
cp apps/api/.env.example apps/api/.env
```

| Variable | Description |
|---|---|
| `PORT` | API server port (default: `3002`) |
| `FRONTEND_URL` | Comma-separated allowed CORS origins (default: `http://localhost:3001`) |
| `TRUSTLESS_WORK_API_URL` | TrustlessWork base URL (default: `https://dev.api.trustlesswork.com`) |
| `TRUSTLESS_WORK_API_KEY` | TrustlessWork API key — see [TrustlessWork API Key](#trustlesswork-api-key) |
| `PLATFORM_STELLAR_ADDRESS` | Your platform's Stellar public address |
| `PLATFORM_FEE_PERCENT` | Platform fee percentage (default: `1`) |
| `HASURA_GRAPHQL_URL` | Hasura HTTP endpoint (default: `http://localhost:8080/v1/graphql`) |
| `HASURA_GRAPHQL_WS_URL` | Hasura WebSocket endpoint (default: `ws://localhost:8080/v1/graphql`) |
| `HASURA_ADMIN_SECRET` | Hasura admin secret — must match the value in `infra/backend/.env` |
| `POLLAR_SECRET_KEY` | Pollar server-side secret — **never expose to the browser** |

### 3. Infrastructure — `infra/backend/.env`

```bash
cp infra/backend/.env.example infra/backend/.env
```

| Variable | Description |
|---|---|
| `POSTGRES_PASSWORD` | Password for the Postgres `postgres` user |
| `HASURA_GRAPHQL_ADMIN_SECRET` | Hasura admin secret (default: `myadminsecretkey`) |
| `HASURA_GRAPHQL_JWT_SECRET` | JWT secret JSON — format: `{"type":"HS256","key":"<32-char-min-key>"}` |
| `HASURA_EVENT_SECRET` | Shared secret for Hasura event trigger webhook calls |
| `FIREBASE_PROJECT_ID` | Firebase project ID (Admin SDK) |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account client email |
| `FIREBASE_PRIVATE_KEY` | Firebase service account private key (PEM string, `\n` for newlines) |

---

## Firebase Setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a project.
2. **Authentication → Sign-in method** → enable **Email/Password**.
3. **Project Settings → Your apps** → register a **Web app** → copy the config object values into `apps/frontend/.env.local`.
4. **Project Settings → Service Accounts** → **Generate new private key** → download the JSON file.
5. Copy `project_id`, `client_email`, and `private_key` from the JSON into `infra/backend/.env`.

---

## TrustlessWork API Key

Required for escrow deploy, fund, and release flows.

1. Install the [Freighter](https://www.freighter.app/) browser extension and switch it to **Testnet**.
2. Go to [dapp.trustlesswork.com](https://dapp.trustlesswork.com) and connect your Freighter wallet.
3. **Settings → Profile** — fill in the use-case field (required before requesting a key).
4. **Settings → API Keys → Request API Key** — select **Testnet**.
5. Copy the key immediately — it is shown only once.
6. Add it to `apps/api/.env` as `TRUSTLESS_WORK_API_KEY`.

Full guide: [docs.trustlesswork.com — Request API Key](https://docs.trustlesswork.com/trustless-work/introduction/developer-resources/request-api-key)

---

## Database Setup

Postgres, the Hasura GraphQL engine, and the webhook service all run inside Docker. The `bin/start` script handles container startup, migrations, metadata deployment, and seeds automatically.

### Standard setup (recommended)

```bash
cd infra/backend
bin/start
```

`bin/start` runs in sequence:

1. Starts Docker containers (Postgres on port `5433`, Hasura on `8080`, webhook on `3000`)
2. Waits for Hasura to pass its health check
3. Applies all Hasura migrations
4. Reloads Hasura metadata
5. Applies seed data

First run takes around 30 seconds while Docker pulls images.

### Reset the database

```bash
cd infra/backend
docker compose down -v   # remove containers and volumes
bin/start                # re-create from scratch
```

### CI / cold-start fast path (no Hasura CLI)

If you need to bootstrap the schema without the Hasura CLI, use the pre-generated SQL files:

```bash
cd infra/backend

# Re-generate init SQL from current migrations (run after adding a new migration)
bin/generate-init-sql

# Apply SQL directly via psql
bin/deploy-init
```

> **Warning:** `bin/deploy-init` applies raw SQL directly via `psql` and does **not** update Hasura's migration tracking table. Do not mix `bin/deploy-init` and `bin/start` against the same database — reset the database first if you need to switch approaches.

---

## Local Services

All backend infrastructure runs as Docker containers defined in `infra/backend/docker-compose.yml`.

| Service | Container | Port | Purpose |
|---|---|---|---|
| PostgreSQL | `postgres` | `5433` (host) → `5432` (container) | Primary database (PostGIS 15) |
| Hasura GraphQL Engine | `graphql-engine` | `8080` | GraphQL API, migrations, console |
| Webhook service | `safetrust-webhook` | `3000` | Hasura event trigger handler |

**Hasura Console** is available at [http://localhost:8080/console](http://localhost:8080/console) once containers are running. Use the admin secret defined in `infra/backend/.env` to log in.

### Useful Docker commands

```bash
# Start containers (from infra/backend)
docker compose up -d

# Stop containers (keep volumes)
docker compose down

# View container logs
docker compose logs -f

# View logs for a specific service
docker compose logs -f graphql-engine

# Check container health
docker compose ps
```

---

## Running the Applications

With Docker containers running, open two terminals from the repo root.

### Start both apps together (recommended)

```bash
pnpm run dev
```

This uses Turborepo to start `apps/frontend` (Next.js, port `3001`) and `apps/api` (Express, port `3002`) concurrently.

### Start apps individually

```bash
# Frontend only
pnpm --filter @safetrust/web run dev

# API only
pnpm --filter @safetrust/api run dev
```

### Start everything including the MCP server

```bash
pnpm run dev:full
```

### Verify the API is running

```bash
curl http://localhost:3002/health
# {"status":"ok"}
```

---

## Running Tests

### Run all tests across the monorepo

```bash
pnpm run test
```

### Run tests for a specific package

```bash
# API tests only
pnpm --filter @safetrust/api run test

# Frontend tests only
pnpm --filter @safetrust/web run test
```

### Watch mode (re-runs on file change)

```bash
# From the api package directory
pnpm --filter @safetrust/api run test:watch
```

### Test coverage (API)

The API coverage report targets `src/routes/escrow/**`:

```bash
pnpm --filter @safetrust/api run test -- --coverage
```

### Type checking (without emitting files)

```bash
# API
pnpm --filter @safetrust/api run type-check

# All packages
pnpm run build --dry-run
```

---

## Common Development Commands

### Install dependencies

```bash
# Install all workspace dependencies
pnpm install

# Add a dependency to a specific package
pnpm --filter @safetrust/api add <package>
pnpm --filter @safetrust/web add <package>

# Add a dev dependency
pnpm --filter @safetrust/api add -D <package>
```

### Build

```bash
# Build all packages
pnpm run build

# Build a specific package
pnpm --filter @safetrust/api run build
pnpm --filter @safetrust/web run build
```

### Lint

```bash
# Lint all packages
pnpm run lint

# Lint a specific package
pnpm --filter @safetrust/web run lint
```

### GraphQL codegen

Generates TypeScript types from the Hasura schema into `packages/graphql/generated/index.ts`. Requires Hasura to be running.

```bash
# Using the live Hasura schema
CODEGEN_SCHEMA_URL=http://localhost:8080/v1/graphql pnpm run codegen

# Using the committed stub schema (no Hasura needed — for CI)
pnpm run codegen
```

### Hasura CLI operations

Run these from `infra/backend`:

```bash
# Open the Hasura Console (tracks schema changes as migrations)
hasura console

# Apply pending migrations
hasura migrate apply

# Apply metadata
hasura metadata apply

# Export current metadata
hasura metadata export

# Check migration status
hasura migrate status
```

---

## Service Port Reference

| Port | Service |
|---|---|
| `3000` | Webhook service (Docker) |
| `3001` | Next.js frontend |
| `3002` | Express API |
| `5433` | PostgreSQL (host-mapped from container port 5432) |
| `8080` | Hasura GraphQL Engine |

---

## Troubleshooting

### `pnpm install` fails with workspace errors

Run `pnpm install` from the **repo root**, never from inside a package directory.

### Hasura console shows no tables

Migrations may not have been applied. From `infra/backend`:

```bash
hasura migrate status
hasura migrate apply
hasura metadata apply
```

### API returns CORS errors

Check that `FRONTEND_URL` in `apps/api/.env` matches the origin your browser is using (e.g. `http://localhost:3001`). Multiple origins can be comma-separated.

### `HASURA_ADMIN_SECRET` mismatch

The admin secret must be identical across all three env files:
- `infra/backend/.env` → `HASURA_GRAPHQL_ADMIN_SECRET`
- `apps/api/.env` → `HASURA_ADMIN_SECRET`
- `apps/frontend/.env.local` → `HASURA_ADMIN_SECRET`

The default value for local development is `myadminsecretkey`.

### Docker containers fail to start

Ensure Docker Desktop is running, then check for port conflicts on `3000`, `5433`, or `8080`. To free a port:

```bash
# View what is using port 8080
lsof -i :8080        # macOS / Linux
netstat -ano | findstr :8080   # Windows
```

### GraphQL codegen fails with schema errors

If Hasura is not running, codegen falls back to the committed stub schema (`apps/frontend/graphql-codegen.schema.graphql`). To run against the live schema, set `CODEGEN_SCHEMA_URL`:

```bash
CODEGEN_SCHEMA_URL=http://localhost:8080/v1/graphql pnpm run codegen
```

### `bin/start` fails after `bin/deploy-init`

These two bootstrap paths cannot be mixed against the same database. Reset first:

```bash
cd infra/backend
docker compose down -v
bin/start
```
