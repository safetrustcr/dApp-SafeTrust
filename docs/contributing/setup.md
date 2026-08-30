# Contributor setup

This is the contributor workflow for SafeTrust. Follow it in order; contributors should use the same setup steps for local development, QA, and pull requests.

## 1) Fork and clone

1. Fork the repo to your personal GitHub account.
2. Clone your fork.
3. Check out the working base branch:

```bash
git clone <your-fork-url>
cd dApp-SafeTrust
git checkout consolidation-pattern
```

If the repo is already cloned, update to the correct base branch before you create your work branch:

```bash
git fetch origin
git checkout consolidation-pattern
```

## 2) Install dependencies

Run this from the repo root:

```bash
pnpm install
```

This repository uses a pnpm workspace. Install from the root so workspace dependencies resolve correctly.

## 3) Get the required environment files from the maintainer

Ask the maintainer for the non-public values before you start the app. Do not invent or reuse personal keys.

The project expects values for:

- frontend Firebase web config
- Hasura admin secret and GraphQL URL
- backend/server credentials for Firebase Admin and Pollar
- TrustlessWork API credentials for testnet flows
- any tenant-specific deployment secrets required by the local stack

The repo examples show the expected keys in:

- `.env.example`
- `apps/frontend/.env.example`
- `apps/api/.env.example`

Typical values you will need in local env files:

```dotenv
# apps/frontend/.env.local
NEXT_PUBLIC_HASURA_GRAPHQL_URL=http://localhost:8080/v1/graphql
HASURA_GRAPHQL_URL=http://localhost:8080/v1/graphql
HASURA_ADMIN_SECRET=your_hasura_admin_secret
NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY=...
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

```dotenv
# apps/api/.env
PORT=3002
FRONTEND_URL=http://localhost:3001
HASURA_GRAPHQL_URL=http://localhost:8080/v1/graphql
HASURA_ADMIN_SECRET=your_hasura_admin_secret
TRUSTLESS_WORK_API_KEY=your_api_key_here
PLATFORM_STELLAR_ADDRESS=your_stellar_address_here
FIREBASE_PROJECT_ID=safetrustcr-596e3
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
POLLAR_SECRET_KEY=...
```

If the maintainer gives you a `.env` file, place it in the correct location and do not commit it.

## 4) Start the backend

In this repository, the backend bootstrap lives under `infra/hasura`.

```bash
cd infra/hasura
bin/start safetrust hotel_industry
```

This starts Docker, applies migrations, deploys tenant metadata, and prepares the Hasura + Postgres stack for local development.

## 5) Create a test account using the DEV ONLY selector

After the app is up, create a local account in the register flow.

Important: use the DEV ONLY role selector in the register form when bootstrapping a local development account. This is an amber-colored developer-only field that exists so contributors can safely create a non-production test user with the right role for local QA without depending on a production user record.

Use it like this:

- select the `DEV ONLY` role selector in the register form
- choose the correct local role for the task you are validating
- complete registration and log in with that account

This selector is only for local development and should not be treated as a production role assignment flow.

## 6) Branch names and issue flow

Create a feature/fix/docs branch from `consolidation-pattern` using the issue number in the name.

Use this pattern:

```bash
git checkout -b feat/issue-42-local-escrow-flow
# or
git checkout -b fix/issue-42-escrow-status-bug
# or
git checkout -b docs/issue-42-contributor-setup
```

The repository standard is:

- `feat/issue-N-description`
- `fix/issue-N-description`
- `docs/issue-N-description`

Keep commits atomic and keep each branch focused on one issue.

## 7) PR checklist

Before opening a PR:

- target branch is `consolidation-pattern`
- issue is linked in the PR description
- summary explains what changed and why
- relevant validation was run
- CodeRabbit review is addressed before requesting approval
- no secrets or local env values are committed

A good PR description includes:

```md
## Summary
- What was changed
- Why it was needed

## Validation
- `pnpm install`
- backend started successfully
- local flow tested
- relevant checks passed

## Related issue
- Closes #<issue-number>
```

## 8) Reset the database when needed

If the database gets into a bad state, reset it completely:

```bash
docker compose down -v
bin/start safetrust hotel_industry
```

This tears down the Postgres and Hasura containers and reapplies the tenant setup from scratch.

## 9) Useful commands

### Kill a port that is already in use

On macOS/Linux:

```bash
lsof -ti :3001,3002,8080,5433 | xargs kill -9
```

On Windows PowerShell:

```powershell
Get-NetTCPConnection -LocalPort 3001,3002,8080,5433 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### Open the Hasura console

```bash
cd infra/hasura
hasura console --endpoint http://localhost:8080 --admin-secret myadminsecretkey
```

### Run TypeScript validation

From the repo root:

```bash
npx tsc --noEmit
```

You can also use the workspace scripts:

```bash
pnpm lint
pnpm test
```

## 10) Final contributor rule

Before you open a PR, confirm that you have:

- started the stack successfully
- created the required local test account
- used the DEV ONLY selector where local role setup is needed
- reset the DB if required
- linked the issue and targeted `consolidation-pattern`

This workflow keeps setup predictable and makes review easier for both maintainers and automated systems.
