<div align="center">

<img src="https://raw.githubusercontent.com/safetrustcr/frontend-SafeTrust/develop/public/img/logo.png" alt="SafeTrust Logo" width="80" />

# dApp-SafeTrust

**Decentralized P2P Escrow · Stellar Blockchain · MVP monorepo**

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-orange?logo=pnpm)](https://pnpm.io)
[![Turborepo](https://img.shields.io/badge/Turborepo-build_system-EF4444?logo=turborepo)](https://turbo.build)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![Hasura](https://img.shields.io/badge/Hasura-GraphQL-1EB4D4?logo=hasura)](https://hasura.io)
[![Stellar](https://img.shields.io/badge/Stellar-Blockchain-7B2BF9?logo=stellar)](https://stellar.org)

<br/>

> **dApp-SafeTrust** is the MVP integration monorepo — it wires `apps/frontend` (Next.js 14) and `apps/api` (Node.js + Express) together through a Hasura GraphQL middleware and a PostgreSQL database. One command starts everything.

<br/>

[🚀 Quick Start](#-quick-start) · [🏗️ Architecture](#️-architecture) · [📁 Structure](#-project-structure) · [🧩 Apps & Packages](#-apps--packages) · [🛠️ Development](#️-development) · [⚠️ Known State](#️-known-state-for-contributors) · [🤝 Contributing](#-contributing)

</div>

---

## 🔐 What is SafeTrust?

SafeTrust is a decentralized platform for secure P2P rental transactions. It holds funds in tamper-proof blockchain escrow contracts on the **Stellar network** via the **TrustlessWork API** — no intermediaries, no hidden fees, full on-chain transparency.

**The core MVP flow:**

```
Tenant finds property → clicks PAY → connects Freighter wallet
→ escrow deployed on Stellar → funds locked until agreement fulfilled
→ owner receives funds on release · tenant recovers deposit on dispute
```

---

## 🏗️ Architecture

dApp-SafeTrust uses a **decoupled, API-first architecture**. Hasura acts as the middleware — it auto-generates a GraphQL API from the database tables, eliminating hand-written REST controllers for data reads.

```
┌─────────────────────────────────────────────────────────────────┐
│                      Stellar Blockchain                         │
│                    (TrustlessWork API)                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP (signed XDR)
┌──────────────────────────▼──────────────────────────────────────┐
│              services/webhook  (Node.js + Express)              │
│         Firebase Auth sync · POST /api/auth/sync-user           │
│         Runs inside Docker as safetrust-webhook                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │ SQL (pg pool)
┌──────────────────────────▼──────────────────────────────────────┐
│              infra/hasura  (MIDDLEWARE)                         │
│         Auto-generated GraphQL API · JWT validation             │
│         Tables: users · escrows · bid_requests · milestones     │
│         Runs on port 8080                                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │ GraphQL (queries · mutations · subscriptions)
┌──────────────────────────▼──────────────────────────────────────┐
│                apps/frontend  (Next.js 14)                      │
│       Apollo Client · Firebase Auth · Freighter Wallet          │
│       Runs on port 3001                                         │
│                                                                 │
│   /login  →  /register  →  /dashboard  →  PAY  →  escrow live  │
└─────────────────────────────────────────────────────────────────┘
```

**Key principle:** `apps/frontend` never talks to `services/webhook` directly for data reads. All reads go through Hasura GraphQL. The webhook service only handles write-heavy operations (auth sync, escrow deploy) that need business logic.

---

## 📁 Project Structure

```
dApp-SafeTrust/
├── apps/
│   ├── frontend/                    ← Next.js 14 (App Router) · port 3001
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx       ← root layout — wraps ClientProviders
│   │   │   │   ├── login/           ← /login page
│   │   │   │   ├── register/        ← /register page
│   │   │   │   └── dashboard/       ← /dashboard page
│   │   │   ├── components/
│   │   │   │   ├── auth/            ← Login.tsx · Register.tsx · wallet modals
│   │   │   │   ├── escrow/          ← EscrowPayFlow · ProcessStepper
│   │   │   │   └── ui/              ← shadcn/ui primitives (all import from @/lib/utils)
│   │   │   ├── config/
│   │   │   │   └── apollo.ts        ← Apollo Client · authLink (Firebase JWT)
│   │   │   ├── lib/
│   │   │   │   ├── firebase.ts      ← Firebase client SDK init
│   │   │   │   ├── subscription-client.ts  ← WebSocket client for subscriptions
│   │   │   │   ├── utils.ts         ← cn() helper (clsx + tailwind-merge)
│   │   │   │   └── walletconnect.ts ← WalletConnect URI stub
│   │   │   ├── graphql/
│   │   │   │   └── queries/
│   │   │   │       └── user-queries.ts  ← GET_USER query
│   │   │   └── providers/
│   │   │       ├── ClientProviders.tsx       ← "use client" wrapper
│   │   │       ├── ApolloProviderWrapper.tsx ← ApolloProvider with apolloClient
│   │   │       └── TrustlessWorkProvider.tsx ← Trustless Work SDK context
│   │   ├── codegen.ts               ← graphql-codegen config
│   │   └── package.json             ← @safetrust/web
│   │
│   └── api/                         ← Node.js + Express · port 3000
│       └── src/
│           ├── index.js             ← Express server entry point
│           ├── lib/
│           │   └── trustlesswork.js ← TrustlessWork API client
│           └── routes/
│               └── escrow/          ← deploy.handler.js · deploy.route.js
│
├── services/
│   └── webhook/                     ← Auth sync service (runs in Docker)
│       └── src/
│           ├── index.js             ← Express entry · port 3000 (inside container)
│           ├── app.js               ← CORS · middleware setup
│           ├── config/
│           │   └── firebase-admin.js ← Firebase Admin SDK init
│           ├── middleware/
│           │   └── auth.js          ← authenticateFirebase — verifies Bearer JWT
│           ├── routes/
│           │   ├── index.js         ← mounts auth routes · /health endpoint
│           │   └── auth.js          ← POST /api/auth/sync-user → upsert public.users
│           └── services/
│               └── db.js            ← PostgreSQL pool (pg)
│
├── infra/
│   └── hasura/
│       ├── docker-compose.yml       ← postgres (5433) · graphql-engine (8080) · webhook
│       ├── bin/
│       │   └── dc_prep              ← bootstrap script: up → wait → migrate → seed
│       ├── metadata/
│       │   ├── base/                ← shared Hasura config (actions, cron triggers…)
│       │   ├── build/safetrust/     ← generated output — do not edit manually
│       │   └── tenants/safetrust/   ← source table YAML (permissions · relationships)
│       ├── migrations/safetrust/    ← timestamped SQL migrations
│       └── seeds/safetrust/         ← 01_users · 02_apartments · 03_bid_requests
│
├── packages/
│   ├── graphql/
│   │   └── generated/
│   │       └── index.ts             ← codegen output — do not edit (empty until codegen runs)
│   └── types/
│       └── src/
│           └── index.ts             ← shared TypeScript interfaces
│
├── pnpm-workspace.yaml
├── turbo.json
└── package.json                     ← root · scripts: dev · build · lint
```

---

## 🧩 Apps & Packages

| Package | Name | Port | Status |
|---|---|---|---|
| `apps/frontend` | `@safetrust/web` | `3001` | ✅ Running — `/login` and `/register` compile clean |
| `apps/api` | `@safetrust/api` | `3000` | ✅ Running — nodemon dev server |
| `services/webhook` | `safetrust-webhook` | `3000` (container) | ✅ Deployed in Docker via `infra/hasura/docker-compose.yml` |
| `infra/hasura` | Hasura + PostgreSQL | `8080` / `5433` | ✅ Migrations + seeds applied via `bin/dc_prep` |
| `packages/types` | `@safetrust/types` | — | ✅ Linked via workspace |
| `packages/graphql` | `@safetrust/graphql` | — | ⚠️ Empty until `pnpm codegen` runs |

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Docker + Docker Compose | latest | [docs.docker.com](https://docs.docker.com/get-docker/) |
| Node.js | ≥ 18 | [nodejs.org](https://nodejs.org) |
| pnpm | ≥ 8 | `npm install -g pnpm` |
| Hasura CLI | latest | `npm install -g hasura-cli` |

### 1. Clone

```bash
git clone https://github.com/safetrustcr/dApp-SafeTrust.git
cd dApp-SafeTrust
```

### 2. Install dependencies

**Always run from the repo root.** Never run `npm install` or `pnpm install` from inside a subdirectory — the `workspace:*` protocol in `package.json` files will fail.

```bash
pnpm install
```

### 3. Configure environment variables

#### Frontend — `apps/frontend/.env.local`

```bash
# Firebase client SDK (Firebase Console → Project Settings → General)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Backend webhook URL (where the frontend posts auth sync)
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000

# Hasura GraphQL
NEXT_PUBLIC_HASURA_GRAPHQL_URL=http://localhost:8080/v1/graphql
NEXT_PUBLIC_HASURA_WS_URL=ws://localhost:8080/v1/graphql
```

#### Backend infrastructure — `infra/hasura/.env`

```bash
POSTGRES_PASSWORD=postgrespassword
HASURA_GRAPHQL_ADMIN_SECRET=myadminsecretkey
HASURA_GRAPHQL_JWT_SECRET='{"type":"RS256","jwk_url":"https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com","audience":"<YOUR_FIREBASE_PROJECT_ID>","issuer":"https://securetoken.google.com/<YOUR_FIREBASE_PROJECT_ID>"}'

# Firebase Admin SDK (Firebase Console → Project Settings → Service Accounts)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=          # must be the service account email, not a personal Gmail
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Webhook shared secret
HASURA_EVENT_SECRET=dev-event-secret-local
WEBHOOK_URL=http://safetrust-webhook:3000
```

### 4. Start the backend stack

```bash
cd infra/hasura
bin/dc_prep
```

`dc_prep` runs in order: starts containers → waits for Hasura healthz → registers the database source → applies migrations → reloads metadata → applies seeds. Takes ~30 seconds on first run.

Verify:

```bash
# Hasura console
open http://localhost:8080/console

# Check seed data
docker exec hasura-postgres-1 psql -U postgres -d postgres \
  -c "SELECT id, email FROM public.users;"

# Check webhook is alive
curl http://localhost:3000/health
```

### 5. Start the frontend and API

In a separate terminal, from the **repo root**:

```bash
pnpm run dev
```

Turborepo starts `apps/frontend` and `apps/api` in parallel.

| URL | Expected |
|---|---|
| `http://localhost:3001` | Redirects to `/login` |
| `http://localhost:3001/login` | Login form with wallet options |
| `http://localhost:3001/register` | Register form — Full Name, Phone, Location, Email, Password |
| `http://localhost:8080/console` | Hasura console |
| `http://localhost:3000/health` | `{ "status": "ok" }` |

### 6. Generate GraphQL types (optional, requires Hasura running)

```bash
pnpm --filter frontend run codegen
```

This introspects the Hasura schema and writes typed Apollo hooks to `packages/graphql/generated/index.ts`. The file is empty until this runs — it does not block auth flow but is required for escrow queries.

---

## 🔌 API Endpoints

### `services/webhook` (runs in Docker)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | — | Liveness check |
| `POST` | `/api/auth/sync-user` | `Bearer <Firebase JWT>` | Upserts user into `public.users` after registration |

### `apps/api` (runs locally via nodemon)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | — | Liveness check |
| `POST` | `/api/escrow/deploy` | `Bearer <Firebase JWT>` | Submit signed XDR to TrustlessWork |

---

## 🗄️ Database

### Core tables

| Table | Purpose |
|---|---|
| `public.users` | Authenticated users — synced from Firebase on register |
| `public.user_wallets` | Stellar wallet addresses per user |
| `public.apartments` | Property listings |
| `public.bid_requests` | Tenant rental offers (`PENDING` / `CANCELLED` / `ACTIVE`) |
| `public.trustless_work_escrows` | On-chain escrow mirror |
| `public.escrow_milestones` | Release schedule per escrow |
| `public.escrow_transactions` | SafeTrust business transaction log |
| `public.trustless_work_webhook_events` | Inbound events from TrustlessWork |
| `public.escrows` | Single-release security deposit escrows |

### Seed data (applied by `dc_prep`)

- 2 demo users (`demo-tenant-uid-001`, `demo-owner-uid-002`)
- 2 demo apartments linked to the demo users
- 2 demo bid requests (`PENDING` + `CANCELLED`)

### Reset database

```bash
cd infra/hasura
docker compose down -v   # removes volumes
bin/dc_prep              # fresh start — migrations + seeds reapplied
```

---

## ⚠️ Known State for Contributors

This section documents the **current implementation state** so contributors don't spend time debugging already-known gaps.

### ✅ Fully wired and tested

| Feature | Details |
|---|---|
| Monorepo bootstrap | `pnpm install` from root resolves all `workspace:*` deps |
| `pnpm run dev` | Starts both `apps/frontend` (port 3001) and `apps/api` (port 3000) via Turborepo |
| Backend Docker stack | `bin/dc_prep` boots postgres + Hasura + webhook, applies migrations and seeds |
| `/login` page | Renders — Firebase auth not yet connected to form submit |
| `/register` page | Renders — Full Name, Phone (+506 default), Location, Email, Password fields |
| Apollo Client | `authLink` reads Firebase JWT from `auth.currentUser.getIdToken()` — wired in `config/apollo.ts` |
| `services/webhook` | `POST /api/auth/sync-user` upserts into `public.users` with COALESCE for optional fields |
| Hasura metadata | All tables tracked, `tenant` + `landlord` roles with row-level permissions |
| `cn()` utility | Lives at `@/lib/utils` — all shadcn/ui components import from here |
| Provider tree | `layout.tsx` → `ClientProviders` → `ApolloProviderWrapper` → `TrustlessWorkProvider` |

### ⚠️ Stubs (compile but not fully implemented)

| File | Status | What's needed |
|---|---|---|
| `src/lib/walletconnect.ts` | Stub — returns `""` | Full WalletConnect SignClient init with project ID |
| `packages/graphql/generated/index.ts` | Empty | Run `pnpm --filter frontend run codegen` with Hasura live |
| `src/app/dashboard/page.tsx` | Shell | Wire `useQuery(GET_USER)` from `src/graphql/queries/user-queries.ts` |
| `src/components/auth/Login.tsx` | UI renders | Connect `signInWithEmailAndPassword` → `setToken()` → redirect `/dashboard` |
| `src/components/auth/Register.tsx` | UI renders | `createUserWithEmailAndPassword` → `getIdToken` → `POST /api/auth/sync-user` — logic exists but needs `.env.local` to run |

### ❌ Not yet started

| Feature | Notes |
|---|---|
| Freighter wallet integration | `useWalletDetection` hook exists, actual Freighter connect not wired |
| Escrow deploy flow | `apps/api/src/routes/escrow/deploy.handler.js` exists, frontend PAY button not connected |
| GraphQL subscriptions | `subscription-client.ts` exists, no active subscriptions in UI |
| Email verification flow | `VerifyEmail.tsx` component exists, Firebase email verification not triggered |

### 🔧 Important conventions

**Never use `sudo` for dev commands.** Running `pnpm install` as root causes `node_modules` to be owned by root, breaking subsequent runs as your normal user. If you already did this:

```bash
sudo chown -R $USER:$USER node_modules
```

**Always run `pnpm` commands from the repo root**, not from inside `apps/frontend/` or any subdirectory. The `workspace:*` protocol only resolves from the workspace root.

**`pnpm --filter frontend dev` uses the package name** — the filter value must match the `name` field in `package.json`. For this repo that name is `@safetrust/web`, so use:

```bash
pnpm run dev   # starts everything (recommended)
# or target a single app:
pnpm --filter @safetrust/web dev
pnpm --filter @safetrust/api dev
```

**The `node_modules` root is owned-by-root** if you ran `pnpm install` with `sudo su` at any point. Fix with `sudo chown -R $USER:$USER node_modules` from the repo root before continuing.

**Firebase `FIREBASE_CLIENT_EMAIL`** must be the service account email (the one ending in `iam.gserviceaccount.com`), not a personal Gmail address. Using a personal email will cause `firebase-admin` to throw on startup.

**`FIREBASE_PRIVATE_KEY` newlines** — the private key must have literal `\n` in the `.env` file. If you copy from the Firebase console JSON, replace actual newlines with `\n` or wrap the value in double quotes with escaped newlines.

---

## 🛠️ Development

### Run all apps

```bash
pnpm run dev
```

### Run a single app

```bash
pnpm --filter @safetrust/web dev
pnpm --filter @safetrust/api dev
```

### Build all

```bash
pnpm build
```

Turborepo builds `packages/types` → `packages/graphql` → then apps.

### Lint

```bash
pnpm lint
```

---

## 🤝 Contributing

### Before you start

1. Read this README fully, especially the [Known State](#️-known-state-for-contributors) section
2. Check existing issues — most missing pieces are already tracked
3. Run the stack locally end-to-end before opening a PR

### Stub convention

If your issue has an unresolved import from a package another contributor is building in parallel, stub it:

```tsx
// TODO: wire in Batch 2 — @/core/store/data
const useGlobalAuthenticationStore = () => ({ address: null, setToken: () => {} });
```

This keeps the build green while the dependency is in flight.

### PR checklist

- [ ] `pnpm run dev` starts without errors
- [ ] `/login` and `/register` still compile (check browser console too)
- [ ] No new `// @ts-ignore` or `any` without a comment explaining why
- [ ] No `console.log` left in production paths
- [ ] Include a short description of what was wired and what remains stubbed
- [ ] Link the issue your PR closes

### Branch naming

```
feat/<issue-number>-short-description
fix/<issue-number>-short-description
```

---

## 🔗 Related Repositories

| Repository | Purpose |
|---|---|
| [frontend-SafeTrust](https://github.com/safetrustcr/frontend-SafeTrust) | Full Next.js frontend (source for `apps/frontend` slices) |
| [backend-SafeTrust](https://github.com/safetrustcr/backend-SafeTrust) | Full Node.js backend (source for `apps/api` slices) |
| [landing-SafeTrust](https://github.com/safetrustcr/landing-SafeTrust) | Marketing landing page |

---

## 📚 Resources

- [TrustlessWork API Docs](https://docs.trustlesswork.com)
- [Hasura GraphQL Docs](https://hasura.io/docs)
- [Stellar Developer Docs](https://developers.stellar.org)
- [Freighter Wallet API](https://docs.freighter.app)
- [Firebase Auth Docs](https://firebase.google.com/docs/auth)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Turborepo Docs](https://turbo.build/repo/docs)

---

<div align="center">

Built with 🔐 by the [SafeTrust](https://github.com/safetrustcr) team · [safetrustcr.vercel.app](https://safetrustcr.vercel.app)

</div>
