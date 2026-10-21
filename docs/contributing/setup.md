# Local Setup for Contributors

## Branch strategy

All PRs target `consolidation-pattern`, not `main`:

```
✅ feat/issue-N-description → consolidation-pattern
❌ feat/issue-N-description → main
```

## Fork and clone

```bash
# Fork safetrustcr/dApp-SafeTrust on GitHub, then:
git clone https://github.com/<your-handle>/dApp-SafeTrust.git
cd dApp-SafeTrust
git remote add upstream https://github.com/safetrustcr/dApp-SafeTrust.git
git checkout consolidation-pattern
git pull upstream consolidation-pattern
```

## Install dependencies

```bash
pnpm install
```

## Get Firebase service account

1. Open Firebase Console → Project settings → Service accounts.
2. Click Generate new private key.
3. Download the JSON file and copy the values for `project_id`, `client_email`, and `private_key`.
4. Add them to your local environment for the API:

```bash
FIREBASE_PROJECT_ID=replace-with-project-id
FIREBASE_CLIENT_EMAIL=replace-with-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nreplace-with-your-private-key\n-----END PRIVATE KEY-----\n"
```

> Keep the `\n` escapes exactly as shown above so dotenv preserves the private key format. Do not start the value with `#`.

## Start infrastructure

```bash
cd infra/backend
bin/start safetrust hotel_industry
cd ../..
```

## Provision isolated Stellar testnet accounts

Use the repository-owned testnet bootstrap when you need the guest/host/admin demo identities, linked wallets, and seeded apartment for end-to-end verification.

```bash
# create or refresh the disposable Stellar + Firebase + Hasura fixtures
pnpm testnet:provision

# verify only; exits non-zero if anything is missing or mismatched
pnpm testnet:provision --check
```

The script reads `.env.testnet.local` (gitignored) and refuses to run against mainnet. It creates or reuses disposable keypairs for the guest, host, and platform roles, funds them on Stellar testnet, ensures the USDC trustline and minimum balance, links each wallet to the matching SafeTrust user record, and seeds the host-owned apartment used by the demo flow.

## Run tests before opening a PR

```bash
pnpm test
# apps/api:     51 tests must pass
# apps/frontend: 105 tests must pass
```

## Commit message format

SafeTrust follows Conventional Commits:

```
type(scope): short description — detail

feat(api): add idempotency service — prevent double-click escrow deploy
fix(frontend): clear role cookie on logout — replace broken document.cookie
refactor(api): migrate sync-user to TypeScript — add verifyIdToken
docs(infra): add docker bootstrap guide
chore(api): merge services/webhook into apps/api — consolidation pattern
```

## File verification workflow

When applying multiple files in a session, verify with grep before proceeding:

```bash
grep "expected-string" path/to/file
```

Use `cat >` heredoc commands rather than file downloads — they are more
reliable for applying changes to disk in complex sessions.

## TypeScript requirements

All new files in `apps/api/src/` must be TypeScript (`.ts`). The migration
from JavaScript to TypeScript is tracked in issues #359 and #360.

Never use `NEXT_PUBLIC_HASURA_ADMIN_SECRET` in the frontend — admin secrets
must never appear in the browser bundle.
