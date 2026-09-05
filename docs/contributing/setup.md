# Contributor Setup Guide

Welcome to **SafeTrust**! This document provides the complete, step-by-step workflow for setting up your local development environment, creating test accounts, managing database state, and contributing to the repository.

---

## 1. Fork, Clone, and Checkout

1. **Fork the Repository**: Go to [safetrustcr/dApp-SafeTrust](https://github.com/safetrustcr/dApp-SafeTrust) on GitHub and click **Fork**.
2. **Clone Your Fork**:
   ```bash
   git clone https://github.com/<your-username>/dApp-SafeTrust.git
   cd dApp-SafeTrust
   ```
3. **Checkout Base Branch**:
   All active development targets the `consolidation-pattern` branch.
   ```bash
   git checkout consolidation-pattern
   ```

---

## 2. Install Dependencies

Install repository dependencies from the root directory using `pnpm`:

```bash
pnpm install
```

> ⚠️ **Important**: Always run `pnpm install` from the repo root so workspace packages (`workspace:*`) resolve correctly.

---

## 3. Obtain Environment Files

Copy the provided template configuration files to local environment files:

```bash
# Frontend environment variables
cp apps/frontend/.env.example apps/frontend/.env.local

# Backend environment variables
cp infra/backend/.env.example infra/backend/.env.local
```

### Variables Requiring Maintainer-Provided Values

Contact the project maintainer to obtain production/testnet staging secrets for:
- `TRUSTLESS_WORK_API_KEY`: API key for TrustlessWork Stellar escrow interactions.
- `NEXT_PUBLIC_FIREBASE_*`: Firebase authentication project API keys and domain credentials.
- `FIREBASE_SERVICE_ACCOUNT`: Service account private key for Hasura/backend authentication.
- `HASURA_GRAPHQL_ADMIN_SECRET`: Admin secret key for local Hasura GraphQL engine.

---

## 4. Backend Bootstrap

Boot up the local backend infrastructure (Hasura GraphQL engine, PostgreSQL, and seed data):

```bash
cd infra/backend
bin/start safetrust hotel_industry
```

### What `bin/start` Does:
1. Launches Docker Compose containers for Postgres and Hasura.
2. Waits for Hasura health checks to pass.
3. Applies database schema migrations (`safetrust`).
4. Tracks tables and metadata relations.
5. Applies seed data for the target industry preset (`hotel_industry`).

---

## 5. Test Account Creation & Role Selector

Start the frontend development server from the repo root in a new terminal:

```bash
pnpm run dev
```

Navigate to `http://localhost:3001/register` to register a test user account.

### DEV ONLY Role Selector

During registration in a local development environment, you will see an **amber box** containing the **DEV ONLY Role Selector**.

* **Why it exists**: In production, user roles (Tenant, Landlord, Admin, Arbiter) are locked or assigned via strict authorization flows. The DEV ONLY selector bypasses this restriction locally, enabling contributors to instantly create test accounts with any role without manual database manipulation.

---

## 6. Branch Naming Conventions

Always create feature branches off `consolidation-pattern` using standard prefixes and issue numbers:

- `feat/issue-N-description` (e.g., `feat/issue-382-escrow-refund-flow`)
- `fix/issue-N-description` (e.g., `fix/issue-104-webhook-signature-validation`)
- `docs/issue-N-description` (e.g., `docs/issue-382-contributor-setup`)

```bash
git checkout -b docs/issue-382-contributor-setup
```

---

## 7. Pull Request Checklist

Before submitting a Pull Request:

1. **Target Branch**: Ensure your PR target branch is `consolidation-pattern`.
2. **Linked Issue**: Include `Closes #N` or `Fixes #N` in your PR description.
3. **CodeRabbit Review**: Address all comments raised by the automated CodeRabbit reviewer before requesting maintainer review.

---

## 8. Database Reset Procedure

If your local database state becomes corrupt or needs a clean slate:

```bash
cd infra/backend
docker compose down -v
bin/start safetrust hotel_industry
```

---

## 9. Useful Commands & Troubleshooting

### Kill Occupied Ports
If ports `3001`, `3002`, or `8080` remain locked by leftover background processes:
```bash
# macOS/Linux
npx kill-port 3001 3002 8080

# Windows PowerShell
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess -Force
```

### Hasura Console
Launch the Hasura admin console to inspect tables and metadata:
```bash
cd infra/backend
hasura console
```

### TypeScript Validation
Run workspace-wide type checks:
```bash
pnpm run check-types
```
