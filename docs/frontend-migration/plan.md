# Frontend SafeTrust migration plan

## Goal

Adopt the presentation quality of the pinned `frontend-SafeTrust` baseline in
the monorepo's `apps/frontend` without replacing its live data, authenticated
session, wallet, escrow, messaging, notification or Testnet behavior.

## Ordered work

1. **Repair baseline checks.** Address the independently recorded frontend and
   API test/typecheck failures. Do not mix these repairs with visual migration.
2. **Shared visual primitives.** Port or merge pure UI primitives, theme tokens,
   shell styling and approved assets. Keep public route behavior unchanged.
3. **Public listings and detail views.** Migrate rent/hotel presentation over
   real adapters and canonical UUID routes. Validate loading, empty and error
   states before continuing.
4. **Authenticated dashboard screens.** Migrate one role-scoped surface per PR:
   guest, host, hotel manager/staff, then platform admin. Retain server-enforced
   role checks.
5. **Messages and notifications.** Migrate visual components while preserving
   conversation membership, subscriptions, unread state and push behavior.
6. **Booking and escrow surfaces.** Migrate only around the existing booking
   orchestrator. Keep wallet signing, server-built XDR, idempotency, pending
   actions and Trustless Work submission unchanged.
7. **Regression evidence.** For each completed route, add or update Vitest
   coverage and capture light/dark responsive screenshots at 360, 768 and 1280
   pixels. Run the Testnet golden path after any escrow/wallet-adjacent change.

## PR boundary rules

- One coherent route family or presentation boundary per PR.
- Include a source-to-destination file manifest.
- Do not change `package.json` or `pnpm-lock.yaml` unless the PR is explicitly
  approved to add a dependency.
- Do not copy source API handlers, middleware, `.env` files, secrets, demo
  fixtures or direct Trustless Work browser calls.
- Keep API errors friendly and preserve accessibility, responsive layout and
  no-horizontal-overflow behavior at 320 pixels.

## Completion definition

The migration is complete only when every route in `routes.md` is either
migrated, intentionally retained, redirected or deferred with a product owner;
all live data originates from the dApp's authorized APIs; and the full quality
gate passes.
