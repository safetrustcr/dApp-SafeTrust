# Local Development Setup Guide

Welcome to the dApp-SafeTrust project! This guide covers the complete local development setup from prerequisites to running the application.

## 1. Prerequisites

Ensure you have the following installed before starting:

| Tool | Version | Installation Command / Link |
|---|---|---|
| Docker | Latest | [Install Docker Desktop](https://www.docker.com/products/docker-desktop/) |
| Node.js | &ge;18 | `nvm install 18 && nvm use 18` |
| pnpm | &ge;8 | `npm install -g pnpm` |
| Hasura CLI | Latest | `curl -L https://github.com/hasura/graphql-engine/raw/stable/cli/get.sh \| bash` |

## 2. Setup Steps

Follow these 6 steps to get your local environment running:

1. **Clone the repository**
   ```bash
   git clone https://github.com/safetrustcr/dApp-SafeTrust.git
   cd dApp-SafeTrust
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment variables**
   Copy the example environment files:
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```
   *Make sure `HASURA_GRAPHQL_URL` is set correctly in `apps/api/.env`.*

4. **Bootstrap the infrastructure**
   Run the following command to start the services (including Hasura):
   ```bash
   bin/start safetrust hotel_industry
   ```

5. **Verify Hasura is healthy**
   Check that Hasura is running properly by verifying the endpoints in the Verification section below.

6. **Start the development server**
   ```bash
   pnpm dev
   ```

## 3. Bootstrap Paths

We support two bootstrap paths depending on whether you need metadata tracking:

| Path | Command | Time | Hasura tracking |
|---|---|---|---|
| Tracked | `bin/start` | ~45s | ✅ updated |
| Fast | `bin/deploy-init` | ~8s | ❌ bypassed |

## 4. Verification

Verify that your services are running correctly:

| Service | URL | Expected Status |
|---|---|---|
| Web App | [http://localhost:3001](http://localhost:3001) | Loads successfully |
| API Health | [http://localhost:3002/health](http://localhost:3002/health) | Returns 200 OK |
| Hasura Console | [http://localhost:8080/console](http://localhost:8080/console) | Console UI loads |

## 5. Common Errors and Fixes

If you encounter issues, check these common errors and their exact fixes:

1. **`EADDRINUSE 3001`**
   *Fix:* `lsof -ti:3001 | xargs kill -9`

2. **`Failed to parse URL from undefined`**
   *Fix:* add `HASURA_GRAPHQL_URL` to `apps/api/.env`

3. **`fetchUserRole: TimeoutError`**
   *Fix:* Hasura not running, start Docker first

4. **`usePollar must be used inside PollarProvider`**
   *Fix:* add `PollarProvider` to `layout.tsx`

5. **`Hasura health check timeout`**
   *Fix:* `docker compose pull` first
