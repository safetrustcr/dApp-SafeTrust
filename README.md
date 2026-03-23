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

<br/>

> **dApp-SafeTrust** is the MVP assembly monorepo — it brings together curated slices from [`frontend-SafeTrust`](https://github.com/safetrustcr/frontend-SafeTrust) and [`backend-SafeTrust`](https://github.com/safetrustcr/backend-SafeTrust) into a single runnable application. One command starts everything.

<br/>

[🚀 Quick Start](#-quick-start) · [🏗️ Architecture](#️-architecture) · [📁 Structure](#-project-structure) · [🧩 Apps & Packages](#-apps--packages) · [🛠️ Development](#️-development) · [🤝 Contributing](#-contributing)

</div>

---

## 🔐 What is SafeTrust?

SafeTrust is a decentralized platform for secure P2P transactions. It holds funds in tamper-proof blockchain escrow contracts on the **Stellar network** via the **TrustlessWork API** — no intermediaries, no hidden fees, full on-chain transparency.

**The core MVP flow:**

```
Tenant finds property → clicks PAY → connects Freighter wallet
→ escrow deployed on Stellar → funds locked until agreement fulfilled
→ owner receives funds on release · tenant recovers deposit on dispute
```

This repository is the **integration layer** that makes that flow runnable end-to-end.

---

## 🏗️ Architecture

dApp-SafeTrust uses a **decoupled, API-first architecture**. Hasura acts as the middleware — it auto-generates a GraphQL API from the database tables, eliminating hand-written REST controllers.

```
┌─────────────────────────────────────────────────────────────────┐
│                      Stellar Blockchain                         │
│                    (TrustlessWork API)                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP (signed XDR)
┌──────────────────────────▼──────────────────────────────────────┐
│                   apps/api  (Node.js)                           │
│         Firebase Auth · Escrow Deploy · Webhook handlers        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ SQL
┌──────────────────────────▼──────────────────────────────────────┐
│              infra/hasura  (MIDDLEWARE)                         │
│         Auto-generated GraphQL API · JWT validation             │
│         Tables: users · escrows · bid_requests · milestones     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ GraphQL (queries · mutations · subscriptions)
┌──────────────────────────▼──────────────────────────────────────┐
│                  apps/web  (Next.js 14)                         │
│       Apollo Client · Firebase Auth · Freighter Wallet          │
│                                                                 │
│   /login  →  /dashboard  →  PAY  →  Escrow status live         │
└─────────────────────────────────────────────────────────────────┘
```

**Key principle:** `apps/web` never talks to `apps/api` directly for data. All reads go through Hasura GraphQL. The API only handles write-heavy operations (auth sync, escrow deploy) that need business logic.

---

## 📁 Project Structure

```
dApp-SafeTrust/
├── apps/
│   ├── web/                         ← Next.js 14 frontend (App Router)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── login/           ← /login page route
│   │   │   │   ├── register/        ← /register page route
│   │   │   │   └── dashboard/       ← /dashboard page route
│   │   │   ├── components/
│   │   │   │   ├── auth/            ← Login.tsx · Register.tsx · wallet modals
│   │   │   │   ├── booking/         ← BookingEscrowWrapper.tsx
│   │   │   │   ├── dashboard/       ← EscrowsByStatus · EscrowTable · EscrowDashboard
│   │   │   │   ├── ui/              ← shadcn/ui primitives (Button · Input · Card…)
│   │   │   │   └── wallet/          ← Freighter wallet connection
│   │   │   ├── core/
│   │   │   │   └── store/           ← Zustand global auth state
│   │   │   ├── graphql/
│   │   │   │   └── documents/       ← escrows.graphql · booking.graphql
│   │   │   └── lib/
│   │   │       ├── apollo-client.ts ← Apollo Client + authLink
│   │   │       └── firebase.ts      ← Firebase client SDK init
│   │   ├── codegen.ts               ← graphql-codegen config
│   │   └── package.json             ← @safetrust/web
│   │
│   └── api/                         ← Node.js + Express backend
│       ├── webhook/
│       │   ├── prepare-escrow-contract.js  ← Hasura Action handler
│       │   ├── escrow-deploy.js            ← submit signed XDR to TrustlessWork
│       │   ├── webhooks.js                 ← escrow status webhook receiver
│       │   └── handlers/
│       │       └── auth/
│       │           ├── auth-middleware.js  ← Firebase token verification
│       │           ├── sync-route.js       ← POST /api/auth/sync-user
│       │           └── user-sync.js        ← upsert user into public.users
│       └── package.json                    ← @safetrust/api
│
├── infra/
│   └── hasura/                      ← MVP-only Hasura configuration
│       ├── migrations/
│       │   └── safetrust/           ← safetrust tenant migrations only
│       │       ├── 1731908059919_create_uuid_extension/
│       │       ├── 1731908676359_create_users/
│       │       ├── 1731909024829_create_user_wallets/
│       │       ├── 1731909059420_create_trustless_work_escrows/
│       │       ├── 1731909059421_create_escrow_milestones/
│       │       ├── 1731909059422_create_trustless_work_webhook_events/
│       │       ├── 1732588166945_create_apartments/
│       │       ├── 1732865994413_create_bid_tables/
│       │       └── <timestamp>_create_escrows_table/
│       ├── metadata/
│       │   ├── base/                ← Hasura base config (actions, cron triggers)
│       │   └── tenants/
│       │       └── safetrust/       ← table tracking · permissions · relationships
│       └── seeds/
│           └── safetrust/
│               ├── users_seed.sql
│               ├── apartments_seed.sql
│               └── bid_requests_seed.sql
│
├── packages/
│   ├── types/                       ← shared TypeScript interfaces
│   │   └── src/
│   │       ├── escrow.ts            ← EscrowStatus · EscrowTransaction · Milestone
│   │       ├── user.ts              ← User · UserWallet
│   │       └── index.ts
│   └── graphql/                     ← codegen output (auto-generated, do not edit)
│       └── generated/
│           └── index.ts             ← typed Apollo hooks consumed by apps/web
│
├── docker-compose.yml               ← starts postgres + hasura + api + web
├── pnpm-workspace.yaml
├── turbo.json
└── .env.example
```

---

## 🧩 Apps & Packages

| Package | Description | Port |
|---|---|---|
| `apps/web` | Next.js 14 frontend — auth, dashboard, escrow views | `3001` |
| `apps/api` | Node.js backend — Firebase auth, escrow deploy, webhooks | `3000` |
| `infra/hasura` | Hasura GraphQL engine + PostgreSQL migrations | `8080` |
| `packages/types` | Shared TypeScript types consumed by both apps | — |
| `packages/graphql` | Generated Apollo hooks (output of codegen) | — |

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Docker + Docker Compose | latest | [docs.docker.com](https://docs.docker.com/get-docker/) |
| Node.js | ≥ 18 | [nodejs.org](https://nodejs.org) |
| pnpm | ≥ 8 | `npm install -g pnpm` |

### 1. Clone the repository

```bash
git clone https://github.com/safetrustcr/dApp-SafeTrust.git
cd dApp-SafeTrust
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in the required values:

```bash
# Firebase (get from Firebase Console → Project Settings → Service Accounts)
FIREBASE_PROJECT_ID=safetrust-890d0
FIREBASE_CLIENT_EMAIL=your-service-account@safetrust-890d0.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Firebase client-side (get from Firebase Console → Project Settings → General)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=safetrust-890d0.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=safetrust-890d0

# TrustlessWork API (get from docs.trustlesswork.com)
TRUSTLESSWORK_API_URL=https://dev.api.trustlesswork.com
TRUSTLESSWORK_API_KEY=your-api-key

# Stellar (testnet addresses)
NEXT_PUBLIC_PLATFORM_ADDRESS=your-platform-stellar-address
NEXT_PUBLIC_USDC_ADDRESS=usdc-trustline-address-on-testnet
NEXT_PUBLIC_STELLAR_NETWORK="Test SDF Network ; September 2015"

# Hasura (keep defaults for local dev)
HASURA_GRAPHQL_ADMIN_SECRET=myadminsecretkey
NEXT_PUBLIC_HASURA_GRAPHQL_URL=http://localhost:8080/v1/graphql
NEXT_PUBLIC_HASURA_WS_URL=ws://localhost:8080/v1/graphql
```

### 3. Start everything

```bash
docker compose up -d
```

This starts four services in the correct order:

```
postgres → hasura (applies migrations + seeds) → api → web
```

### 4. Verify

| Service | URL | Expected |
|---|---|---|
| Frontend | http://localhost:3001 | Redirects to `/login` |
| Hasura Console | http://localhost:8080/console | Tables visible |
| API health | http://localhost:3000/health | `{ "status": "ok" }` |

---

## 🛠️ Development

### Install dependencies

```bash
pnpm install
```

### Run all apps in dev mode

```bash
pnpm dev
```

Turborepo starts `apps/web` and `apps/api` in parallel, respecting the dependency graph.

### Run a single app

```bash
pnpm dev --filter @safetrust/web
pnpm dev --filter @safetrust/api
```

### Generate GraphQL types

Requires Hasura to be running (`docker compose up hasura -d`):

```bash
pnpm codegen --filter @safetrust/web
```

This introspects the Hasura schema and writes typed Apollo hooks to `packages/graphql/generated/index.ts`.

### Build all apps

```bash
pnpm build
```

Turborepo builds packages first (`types` → `graphql`), then apps.

### Run tests

```bash
pnpm test
```

---

## 🗄️ Database

Hasura automatically applies all migrations and seeds from `infra/hasura/` on first start.

### Core tables (MVP)

| Table | Purpose |
|---|---|
| `public.users` | Authenticated users (synced from Firebase) |
| `public.user_wallets` | Stellar wallet addresses per user |
| `public.apartments` | Property listings |
| `public.bid_requests` | Tenant interest / rental offers |
| `public.trustless_work_escrows` | Blockchain mirror — on-chain escrow state |
| `public.escrow_milestones` | Release schedule per escrow |
| `public.escrow_transactions` | SafeTrust business transaction log |
| `public.trustless_work_webhook_events` | Inbound events from TrustlessWork |
| `public.escrows` | Single-release security deposit escrows |

### Access Hasura Console

```
http://localhost:8080/console
Admin secret: myadminsecretkey
```

### Reset database

```bash
docker compose down -v        # removes volumes
docker compose up -d          # fresh start, migrations re-applied
```

---

## 🔌 API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | — | Service health check |
| `POST` | `/api/auth/sync-user` | Bearer token | Sync Firebase user → `public.users` |
| `POST` | `/prepare-escrow-contract` | Bearer token | Hasura Action: create escrow payload |
| `POST` | `/api/escrow/deploy` | Bearer token | Submit signed XDR to TrustlessWork |
| `POST` | `/webhooks/escrow_status_update` | — | Receive escrow status from TrustlessWork |
| `POST` | `/webhooks/firebase/user-created` | HMAC | Firebase user creation webhook |

---

## 🌊 Contributing

This repository is part of the **Wave contributor program**. Issues are batched into scoped sprints so contributors can work in parallel without blocking each other.

### Issue Batches

| Batch | Focus | Status |
|---|---|---|
| Batch 1 | `apps/web/` structure — copy frontend slices, scaffold shell | 🟠 Active |
| Batch 2 | `apps/api/` slice + `infra/hasura/` MVP migrations | 🔜 Next |
| Batch 3 | Integration A→B→C — Firebase auth, GraphQL wiring, PAY button | 🔜 Planned |

### Stub convention

Issues in Batch 1 may have unresolved imports. Replace them with:

```tsx
// TODO: wire in Batch 2 — @/core/store/data
const useGlobalAuthenticationStore = () => ({ address: null });
```

This keeps the build green while the dependent issue is in progress.

### Before opening a PR

- Read the [Contributing Guide](https://github.com/safetrustcr/Frontend/issues/34)
- Follow the [Git Guidelines](https://github.com/safetrustcr/Frontend/issues/35)
- Include a Loom video in your PR showing before/after
- Link the issue your PR closes

---

## 🔗 Related Repositories

| Repository | Purpose |
|---|---|
| [frontend-SafeTrust](https://github.com/safetrustcr/frontend-SafeTrust) | Full Next.js frontend (source for `apps/web/` slices) |
| [backend-SafeTrust](https://github.com/safetrustcr/backend-SafeTrust) | Full Node.js backend (source for `apps/api/` slices) |
| [landing-SafeTrust](https://github.com/safetrustcr/landing-SafeTrust) | Marketing landing page |

---

## 📚 Resources

- [TrustlessWork API Docs](https://docs.trustlesswork.com)
- [Hasura GraphQL Docs](https://hasura.io/docs)
- [Stellar Developer Docs](https://developers.stellar.org)
- [Freighter Wallet API](https://docs.freighter.app)
- [Firebase Auth Docs](https://firebase.google.com/docs/auth)

---

<div align="center">

Built with 🔐 by the [SafeTrust](https://github.com/safetrustcr) team · [safetrustcr.vercel.app](https://safetrustcr.vercel.app)

</div>
