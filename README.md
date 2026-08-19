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

**Use cases:** rental deposits, service agreements, P2P property rentals.

**Core flow:**

```
Tenant finds property → PAY → Freighter signs XDR → funds locked on-chain
→ released on fulfillment or returned on dispute
```

---

## Architecture
```
Stellar Blockchain (TrustlessWork API)
│ signed XDR
services/webhook (Node + Express, port 3002)
│ SQL
infra/hasura (Hasura GraphQL, port 8080)
│ GraphQL
apps/frontend (Next.js 14, port 3001)
```

---

## Quick Start

### Prerequisites

| Tool | Min version |
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
pnpm install
```

> ⚠️ Always run `pnpm install` from the **repo root** — `workspace:*` deps only resolve from there.

---

### 2. Set up environment variables

**Step 1 — Frontend:**
```bash
cp apps/frontend/.env.example apps/frontend/.env.local
```

**Step 2 — Hasura / Backend:**
```bash
cp infra/hasura/.env.example infra/hasura/.env.local
```

Fill in both files before continuing. See the sections below for how to obtain each value.

---

### 3. Firebase setup

SafeTrust uses Firebase for authentication.

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → create a project.
2. **Authentication → Sign-in method** → enable **Email/Password**.
3. **Project Settings → Your apps** → register a Web app → copy the config values into `apps/frontend/.env.local`.
4. **Project Settings → Service Accounts** → Generate new private key → copy `project_id`, `client_email`, `private_key` into `infra/hasura/.env.local`.

---

### 4. TrustlessWork API key

Required for escrow deploy, fund, and release flows.

1. Go to [dapp.trustlesswork.com](https://dapp.trustlesswork.com) → connect **Freighter wallet**.
2. **Settings → Profile** → fill in the use-case field (required).
3. **Settings → API Keys** → Request API Key → select **Testnet**.
4. Copy the key immediately — shown only once.

Add to `apps/frontend/.env.local`:
```dotenv
TRUSTLESS_WORK_API_KEY=<your_testnet_key>
TRUSTLESS_WORK_API_URL=https://dev.api.trustlesswork.com
```

Full guide: [docs.trustlesswork.com → Request API Key](https://docs.trustlesswork.com/trustless-work/introduction/developer-resources/request-api-key)

---

### 5. Start the backend

```bash
cd infra/hasura
bin/dc_prep
```

`dc_prep` runs in order: starts Docker containers → waits for Hasura health → applies migrations → reloads metadata → applies seeds. Takes ~30 s on first run.

**Reset the database:**
```bash
docker compose down -v
bin/dc_prep
```

---

### 6. Run the frontend

From the **repo root** in a separate terminal:

```bash
pnpm run dev
```

Starts both `apps/frontend` (port 3001) and `apps/api` (port 3002) via Turborepo.

---

### 7. Generate GraphQL types (optional)

Requires Hasura running:

```bash
pnpm --filter @safetrust/web run codegen
```

Writes typed Apollo hooks to `packages/graphql/generated/index.ts`.

---

## TrustlessWork Escrow Flow

> Reference only — not an implementation step.

All TrustlessWork calls return an **unsigned XDR** that Freighter must sign before broadcast.

```bash
Deploy: POST /deployer/single-release → XDR → sign → POST /helper/send-transaction
Fund: POST /escrow/single-release/v2/fund → XDR → sign → POST /helper/send-transaction
Release: POST /escrow/single-release/v2/release-funds → XDR → sign → POST /helper/send-transaction
```

Full API reference: [docs.trustlesswork.com](https://docs.trustlesswork.com)

---

## Contributing

1. Run `pnpm run dev` — both apps must start without errors.
2. No `console.log` in production paths, no unexplained `any` or `@ts-ignore`.
3. Link the issue your PR closes.

**Branch naming:** `feat/<issue-number>-short-description` · `fix/<issue-number>-short-description`

- [Contributing Guide](https://github.com/safetrustcr/Frontend/issues/34)
- [Git Guidelines](https://github.com/safetrustcr/Frontend/issues/35)

### AI-native development (optional)

`mcp.json` at the repo root connects Cursor and Claude Code to:

- TrustlessWork docs and live escrow tools
- Stellar Raven — Stellar ecosystem docs + live data

Cursor picks up `mcp.json` automatically.
For `stellar-raven`: run `/mcp` → Authenticate → sign in in browser.
No API keys required for any server.

---

## License

© 2026 SafeTrust. Released under the [MIT License](https://opensource.org/license/MIT).
