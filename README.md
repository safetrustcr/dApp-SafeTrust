<div align="center">
<img src="https://raw.githubusercontent.com/safetrustcr/frontend-SafeTrust/develop/public/img/logo.png" alt="SafeTrust Logo" width="80" />

# dApp-SafeTrust
**Decentralized P2P Escrow · Stellar Blockchain · MVP Monorepo**

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-orange?logo=pnpm)](https://pnpm.io)
[![Turborepo](https://img.shields.io/badge/Turborepo-build_system-EF4444?logo=turborepo)](https://turbo.build)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![Hasura](https://img.shields.io/badge/Hasura-GraphQL-1EB4D4?logo=hasura)](https://hasura.io)
[![Stellar](https://img.shields.io/badge/Stellar-Blockchain-7B2BF9?logo=stellar)](https://stellar.org)
[![💧 Drips Wave](https://img.shields.io/badge/💧_Drips-Wave-7B2BF9)](https://www.drips.network/wave)
[![🦊 GrantFox](https://img.shields.io/badge/🦊_GrantFox-GrantFox-FF6B00)](https://grantfox.xyz/)
[![🔥 Firebase](https://img.shields.io/badge/🔥_Firebase-Firebase-FFCA28)](https://firebase.google.com/)
[![🔐 TrustlessWork](https://img.shields.io/badge/🔐_TrustlessWork-EaaS-00C2A8)](https://docs.trustlesswork.com/trustless-work)
</div>

---

## What is SafeTrust?

SafeTrust is a decentralized P2P escrow platform for rental transactions. Funds are held in tamper-proof smart contracts on the **Stellar network** via the **[TrustlessWork API](https://docs.trustlesswork.com)** — no intermediaries, full on-chain transparency.

### Use Cases

- **Rental deposits** — A tenant pays a security deposit. Funds are locked on-chain until the rental period ends; released to the owner on fulfillment or returned on dispute resolution.
- **Service agreements** — A client and provider agree on milestones. Funds release per milestone as each is approved, with a neutral dispute resolver as backstop.
- **P2P property rentals** — Owner lists a property; tenant submits a bid; on acceptance, escrow is deployed automatically via Freighter wallet signing.

### Core Flow

```
Tenant finds property → clicks PAY → connects Freighter wallet
→ SafeTrust calls POST /deployer/single-release (TrustlessWork API)
→ API returns unsigned XDR → Freighter signs it
→ POST /helper/send-transaction broadcasts to Stellar
→ funds locked on-chain until release conditions are met
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│         Stellar Blockchain              │
│       (TrustlessWork API)               │
└───────────────┬─────────────────────────┘
                │ signed XDR
┌───────────────▼─────────────────────────┐
│    services/webhook  (Node + Express)   │
│    Firebase Auth sync · escrow deploy   │
│    Container: safetrust-webhook         │
└───────────────┬─────────────────────────┘
                │ SQL
┌───────────────▼─────────────────────────┐
│    infra/hasura  (Hasura GraphQL)       │
│    Auto-generated API · JWT auth        │
│    Port 8080                            │
└───────────────┬─────────────────────────┘
                │ GraphQL
┌───────────────▼─────────────────────────┐
│    apps/frontend  (Next.js 14)          │
│    Apollo Client · Firebase · Freighter │
│    Port 3001                            │
└─────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites

| Tool | Version |
|---|---|
| Docker + Docker Compose | latest |
| Node.js | ≥ 18 |
| pnpm | ≥ 8 |
| Hasura CLI | latest |

```bash
npm install -g pnpm hasura-cli
```

### 1. Clone and install

```bash
git clone https://github.com/safetrustcr/dApp-SafeTrust.git
cd dApp-SafeTrust
pnpm install          # always run from repo root
```

> ⚠️ Never run `pnpm install` from inside a subdirectory — `workspace:*` deps only resolve from the root.

### 2. Set up environment variables

```bash
cp apps/frontend/.env.example apps/frontend/.env.local
```

Open `apps/frontend/.env.local` and fill in every value. The table below summarises what is required and where each value comes from.

| Variable | Required | Source |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | ✅ | Firebase Console → Project Settings → Your apps |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | ✅ | same |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ✅ | same |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | ✅ | same |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ✅ | same |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ✅ | same |
| `NEXT_PUBLIC_HASURA_GRAPHQL_URL` | ✅ | `http://localhost:8080/v1/graphql` (default) |
| `NEXT_PUBLIC_HASURA_WS_URL` | ✅ | `ws://localhost:8080/v1/graphql` (default) |
| `HASURA_ADMIN_SECRET` | ✅ | Must match `HASURA_GRAPHQL_ADMIN_SECRET` in `infra/hasura/.env` |
| `NEXT_PUBLIC_BACKEND_URL` | ✅ | `http://localhost:3002` (default) |
| `TRUSTLESS_WORK_API_KEY` | ✅ | See below — **crashes the server if missing** |
| `TRUSTLESS_WORK_API_URL` | ✅ | `https://dev.api.trustlesswork.com` (testnet default) |
| `NEXT_PUBLIC_PLATFORM_ADDRESS` | ✅ | Your SafeTrust Stellar wallet address |
| `NEXT_PUBLIC_USDC_ADDRESS` | ✅ | Pre-filled in `.env.example` — do not change for testnet |

> ⚠️ `TRUSTLESS_WORK_API_KEY`, `TRUSTLESS_WORK_API_URL`, and `HASURA_ADMIN_SECRET` are read at module load time. If any of them is missing, Next.js will crash immediately on `pnpm run dev`.

#### Getting a TrustlessWork API key

1. Go to [dapp.trustlesswork.com](https://dapp.trustlesswork.com) and connect your **Freighter wallet**.
2. Under **Settings → Profile**, fill in the use-case field (required before you can request a key).
3. Under **Settings → API Keys**, click **Request API Key** and select **Testnet**.
4. Copy the key immediately — it is shown only once.

Full guide: [docs.trustlesswork.com → Request API Key](https://docs.trustlesswork.com/trustless-work/introduction/developer-resources/request-api-key)

---

## Firebase Setup

SafeTrust uses Firebase for user authentication. You need a Firebase project before running the app.

### Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a new project.
2. Under **Authentication → Sign-in method**, enable **Email/Password**.
3. Under **Project Settings → General → Your apps**, register a **Web app** and copy the config values.
4. Under **Project Settings → Service Accounts**, click **Generate new private key** and download the JSON file. You'll need the `project_id`, `client_email`, and `private_key` fields from it.

### Frontend environment — `apps/frontend/.env.local`

Copy from the template and fill in your values:

```bash
cp apps/frontend/.env.example apps/frontend/.env.local
```

See [Step 2: Set up environment variables](#2-set-up-environment-variables) in the Quick Start section for the full variable reference and instructions for each value.

---

## Backend Setup (Hasura + Docker)

### Environment — `infra/hasura/.env`

```bash
# PostgreSQL
POSTGRES_PASSWORD=postgrespassword

# Hasura admin secret (choose any string)
HASURA_GRAPHQL_ADMIN_SECRET=myadminsecretkey

# Firebase JWT verification — replace YOUR_FIREBASE_PROJECT_ID with your actual project ID
HASURA_GRAPHQL_JWT_SECRET='{"type":"RS256","jwk_url":"https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com","audience":"YOUR_FIREBASE_PROJECT_ID","issuer":"https://securetoken.google.com/YOUR_FIREBASE_PROJECT_ID"}'

# Firebase Admin SDK — from the service account JSON you downloaded
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=           # ends in iam.gserviceaccount.com — not a personal Gmail
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Webhook
HASURA_EVENT_SECRET=dev-event-secret-local
WEBHOOK_URL=http://safetrust-webhook:3000
```

> ⚠️ `FIREBASE_PRIVATE_KEY` must use literal `\n` for newlines. Wrap the value in double quotes exactly as shown above.

### Start the backend

```bash
cd infra/hasura
bin/dc_prep
```

`bin/dc_prep` runs in order: starts containers → waits for Hasura health → applies migrations → reloads metadata → applies seeds. Takes ~30 s on first run.

**Verify it's working:**

```bash
open http://localhost:8080/console          # Hasura console
curl http://localhost:3000/health           # webhook: { "status": "ok" }
```

### Reset the database

```bash
cd infra/hasura
docker compose down -v    # removes volumes
bin/dc_prep               # fresh start
```

---

## Run the Frontend

From the **repo root**, in a separate terminal:

```bash
pnpm run dev
```

Turborepo starts `apps/frontend` (port 3001) and `apps/api` (port 3000) in parallel.

| URL | What you see |
|---|---|
| `http://localhost:3001` | Redirects to `/login` |
| `http://localhost:3001/login` | Login form with wallet options |
| `http://localhost:3001/register` | Register form |
| `http://localhost:8080/console` | Hasura console |

### Generate GraphQL types (optional)

Requires Hasura to be running:

```bash
pnpm --filter @safetrust/web run codegen
```

- Writes typed Apollo hooks to `packages/graphql/generated/index.ts`. Not required for auth flow, but needed for escrow queries.

---

## TrustlessWork Escrow Integration - EaaS
> ⚠️ **Not an implementation step** — this section describes the TrustlessWork API for reference only.

SafeTrust deploys and funds escrow contracts via the [TrustlessWork API](https://docs.trustlesswork.com/trustless-work). All calls require an `x-api-key` header and return an **unsigned XDR transaction** that must be signed by Freighter Wallet before being broadcast to Stellar.

### EaaS flow 

```
POST /deployer/single-release   → returns unsignedTransaction (XDR)
           Wallet signs the XDR
           POST /helper/send-transaction  → broadcasts to Stellar (escrow deployed)
```
- [trustlesswork-initialize-escrow](https://docs.trustlesswork.com/trustless-work/api-rest/deploy/initialize-escrow)

```
POST /escrow/single-release/fund-escrow → returns unsignedTransaction (XDR)
           Wallet signs the XDR
           POST /helper/send-transaction  → broadcasts to Stellar (escrow funded)
```
- [trustlesswork-fund-escrow](https://docs.trustlesswork.com/trustless-work/api-rest/deploy/fund-escrow)

---

Full API reference: [docs.trustlesswork.com](https://docs.trustlesswork.com)

---

## Contributing

Before opening a PR:

1. Run `pnpm run dev` — both apps must start without errors.
2. `/login` and `/register` must compile clean.
3. No `console.log` in production paths, no unexplained `any` or `@ts-ignore`.
4. Link the issue your PR closes.

**Branch naming:** `feat/<issue-number>-short-description` · `fix/<issue-number>-short-description`

**Stub convention** — if your issue depends on a package another contributor is building, stub it rather than blocking:

```tsx
// TODO: wire in Batch 2 — @/core/store/data
const useGlobalAuthenticationStore = () => ({ address: null, setToken: () => {} });
```

- [Contributing Guide](https://github.com/safetrustcr/Frontend/issues/34)
- [Git Guidelines](https://github.com/safetrustcr/Frontend/issues/35)

---

## Related Repositories

| Repository | Purpose |
|---|---|
| [frontend-SafeTrust](https://github.com/safetrustcr/frontend-SafeTrust) | Full Next.js frontend (source for `apps/frontend` slices) |
| [backend-SafeTrust](https://github.com/safetrustcr/backend-SafeTrust) | Full Hasura backend (source for migrations and seeds) |
| [landing-SafeTrust](https://github.com/safetrustcr/landing-SafeTrust) | Marketing landing page |

---

<div align="center">

Built with 🔐 by the [SafeTrust](https://github.com/safetrustcr) team · [safetrustcr.vercel.app](https://safetrustcr.vercel.app)

</div>
