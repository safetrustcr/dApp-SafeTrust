# Baseline: toolchain and recorded command results

Issue: [#519](https://github.com/safetrustcr/dApp-SafeTrust/issues/519) · Target base: `dApp-SafeTrust@3e120c5063f8fe866d6425a471c12f49541d38ee`

This is the reproducible starting point for every UI-migration PR. The numbers below are the output of real runs against the pinned base commit **before any UI code moves**. Existing failures are recorded as they are; nothing here is fixed by #519.

## 1. Tested toolchain

| Tool | Version used | Source of truth |
| --- | --- | --- |
| Node.js | **22.23.2** (`v22.23.2`) | tested locally; pinned in `.nvmrc` |
| pnpm | **11.5.1** | root `package.json` `packageManager: "pnpm@11.5.1"` |
| npm | 10.9.8 | only used for registry lookups, never for installs |
| OS | Linux x64 (container, cold pnpm store) | Freebuff/Daytona sandbox |

### Why 22, when the root `engines` says `>=18.17.0`?

- The root `engines` field (`node: ">=18.17.0"`) describes what the **application code** needs, not what the **pnpm pin** supports.
- `pnpm@11.5.1` declares `engines: { node: ">=22.13" }` (registry metadata for the pinned pnpm). Running the pinned package manager on Node 18/20 is therefore unsupported, and `pnpm --version` is the first thing a contributor hits.
- Node 22.23.2 installed the workspace and ran every command below; no Node-version-specific failure was observed.
- The source UI repository declares `engines: { node: ">=20.18 <23" }` and its own `.nvmrc` is `22`, so 22 is also the only version both repositories agree on.
- Recommendation: pin **`.nvmrc` = `22.23.2`** now (this PR), and treat a change to root `engines` as a separate, reviewed decision rather than a side effect of a UI PR.

## 2. Baseline commands

Run from the repository root with Node 22.23.2 and pnpm 11.5.1.

| # | Command | Result | Exit |
| --- | --- | --- | --- |
| 1 | `pnpm install --frozen-lockfile` | **pass** | 0 |
| 2 | `pnpm --filter @safetrust/web lint` | **fail** (2 parse errors, 5 warnings) | 1 |
| 3 | `pnpm --filter @safetrust/web exec tsc --noEmit` | **fail** (20 errors in 2 files) | 2 |
| 4 | `pnpm --filter @safetrust/web test` | **fail** (5 of 25 files fail, 143 tests pass) | 1 |
| 5 | `pnpm build` | **fail** (`@safetrust/api` type errors; `@safetrust/web` webpack error) | 2 |

Summary: **1 of 5 baseline commands passes.** The four failures are pre-existing on the pinned commit and are caused by three damaged files plus API type errors — see §3.

### 2.1 `pnpm install --frozen-lockfile`

```
Progress: resolved 1518, reused 0, downloaded 1514, added 1518, done
.../node_modules/unrs-resolver postinstall$ node postinstall.js
.../node_modules/unrs-resolver postinstall: Done

devDependencies:
+ @stellar/stellar-sdk 15.1.0
+ dotenv 16.6.1
+ eslint 8.57.1
+ eslint-config-next 14.2.35
+ firebase-admin 14.3.0
+ tsx 4.23.12
+ turbo 2.10.7
+ typescript 5.9.3

Done in 55.1s using pnpm v11.5.1
```

The lockfile is in sync; a fresh install needs no `--no-frozen-lockfile` and no postinstall patches.

### 2.2 `pnpm --filter @safetrust/web lint`

```text
$ next lint

./src/components/booking/BookingEscrowOrchestrator.test.tsx
12:98  Warning: Using `<img>` could result in slower LCP ... @next/next/no-img-element

./src/components/dashboard/hotels/__tests__/HotelImagePicker.test.tsx
5:98  Warning: Using `<img>` could result in slower LCP ... @next/next/no-img-element

./src/components/escrow/EscrowDetailView.tsx
978:6  Warning: React Hook useEffect has a missing dependency: 'streamData'.
       Either include it or remove the dependency array.  react-hooks/exhaustive-deps

./src/components/ui/card.tsx
Error: Parsing error: ')' expected.

./src/hooks/use-hotel-escrow-resource.ts
30:31  Warning: The ref value 'generation.current' will likely have changed by the time
       this effect cleanup function runs.  react-hooks/exhaustive-deps

./src/lib/push.test.ts
1:251  Error: Parsing error: ';' expected.

info  - Need to disable some ESLint rules? Learn more here: ...
[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] @safetrust/web@0.1.0 lint: `next lint`
Exit status 1
```

Errors: `ui/card.tsx:37` and `lib/push.test.ts:1` (both invalid source, see §3). Warnings: 2 × `no-img-element`, 3 × `exhaustive-deps`.

### 2.3 `pnpm --filter @safetrust/web exec tsc --noEmit`

```text
src/components/ui/card.tsx(37,1): error TS1005: ')' expected.
src/components/ui/card.tsx(37,37): error TS1005: ')' expected.
src/components/ui/card.tsx(53,8): error TS1005: ',' expected.
src/components/ui/card.tsx(53,24): error TS1005: ',' expected.
src/components/ui/card.tsx(53,25): error TS17008: JSX element 'HTMLDivElement' has no corresponding closing tag.
src/components/ui/card.tsx(54,21): error TS1109: Expression expected.
src/components/ui/card.tsx(54,30): error TS1381: Unexpected token. Did you mean `{'}'}` or `&rbrace;`?
src/components/ui/card.tsx(54,39): error TS1382: Unexpected token. Did you mean `{'>'}` or `&gt;`?
src/components/ui/card.tsx(60,17): error TS1003: Identifier expected.
src/components/ui/card.tsx(61,25): error TS17008: JSX element 'HTMLDivElement' has no corresponding closing tag.
src/components/ui/card.tsx(62,1): error TS1382: Unexpected token. Did you mean `{'>'}` or `&gt;`?
src/components/ui/card.tsx(62,22): error TS1109: Expression expected.
src/components/ui/card.tsx(62,31): error TS1381: Unexpected token. Did you mean `{'}'}` or `&rbrace;`?
src/components/ui/card.tsx(62,40): error TS1382: Unexpected token. Did you mean `{'>'}` or `&gt;`?
src/components/ui/card.tsx(78,1): error TS1109: Expression expected.
src/components/ui/card.tsx(79,1): error TS1005: '</' expected.
src/lib/push.test.ts(1,252): error TS1005: ';' expected.
src/lib/push.test.ts(1,424): error TS1146: Declaration expected.
src/lib/push.test.ts(1,8264): error TS1005: ';' expected.
[ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL] Command failed with exit code 2: tsc --noEmit
```

20 errors, all syntax errors in the same two files. No type-level errors elsewhere in `apps/frontend`.

### 2.4 `pnpm --filter @safetrust/web test`

```text
 ✓ src/lib/hotels.test.ts (9 tests) 21ms
 ✓ src/middleware.test.ts (23 tests) 28ms
 ✓ src/lib/server/escrow-db.test.ts (16 tests) 15ms
 ✓ src/lib/auth/register.test.ts (10 tests) 13ms
 ✓ src/app/api/health/hasura/route.test.ts (8 tests) 14ms
 ✓ src/lib/middleware/fetch-user-role.test.ts (9 tests) 15ms
 ✓ src/lib/rent/property-listing.test.ts (2 tests) 4ms
 ✓ src/lib/hotel-access.test.ts (18 tests) 12ms
 ✓ src/lib/api/hotels.test.ts (6 tests) 9ms
 ✓ src/lib/api/messages.test.ts (5 tests) 8ms
 ✓ src/lib/api/escrow.test.ts (4 tests) 7ms
 ✓ src/lib/rent/filterRentListings.test.ts (3 tests) 5ms
 ✓ src/components/dashboard/hotels/__tests__/MyHotelsTable.test.tsx (6 tests) 964ms
 ✓ src/app/rent/page.test.tsx (1 test) 425ms
 ✓ src/components/booking/BookingEscrowOrchestrator.test.tsx (3 tests) 331ms
 ✓ src/components/dashboard/hotels/__tests__/HotelImagePicker.test.tsx (2 tests) 385ms
 ✓ src/components/ui/HasuraDownBanner.test.tsx (7 tests) 165ms
 ✓ src/components/dashboard/hotels/__tests__/SchemaConstraintsHint.test.tsx (1 test) 55ms
 ✓ src/hooks/use-escrow-action.test.tsx (4 tests) 40ms
 ✓ src/hooks/use-hotel-dashboard-data.test.tsx (6 tests) 26ms

 FAIL  src/lib/push.test.ts [ src/lib/push.test.ts ]
Error: Transform failed with 1 error
 FAIL  src/components/escrow/EscrowPayFlow.test.tsx [ ... ]
 FAIL  src/components/escrow/WalletReadinessChecklist.test.tsx [ ... ]
 ❯ src/components/auth/wallet/constants/wallet-kit.constant.ts:1:1
 FAIL  src/components/dashboard/hotels/__tests__/HotelDetailsView.test.tsx [ ... ]
 FAIL  src/components/dashboard/hotels/__tests__/HotelForm.test.tsx [ ... ]
Error: Failed to resolve entry for package "@safetrust/types". ...

 Test Files  5 failed | 20 passed (25)
      Tests  143 passed (143)
      Duration  32.39s
```

No assertion fails: all 143 collected tests pass. The five failing **files** never collect because of parse/resolve problems:

| Failing file | Cause |
| --- | --- |
| `src/lib/push.test.ts` | file content is base64 text, not TypeScript → esbuild transform error |
| `src/components/escrow/EscrowPayFlow.test.tsx` | imports `auth/wallet/constants/wallet-kit.constant.ts`, which is truncated mid-expression (`walletKit = new` at EOF) |
| `src/components/escrow/WalletReadinessChecklist.test.tsx` | same truncated wallet-kit module |
| `src/components/dashboard/hotels/__tests__/HotelDetailsView.test.tsx` | imports `ui/card.tsx`, which has a stray `JCardTitle` token |
| `src/components/dashboard/hotels/__tests__/HotelForm.test.tsx` | two stacked causes: `@safetrust/types` resolves to `packages/types/dist/index.js`, which does not exist when the package script runs directly (turbo's `test` task has `dependsOn: ["^build"]`; `pnpm --filter @safetrust/web test` bypasses turbo), and after building that package the run then hits the `ui/card.tsx` parse error |

Verified locally: `pnpm --filter @safetrust/types build` makes `dist/` exist, after which `HotelForm.test.tsx` fails with `card.tsx:37 ERROR: Expected ")" but found "JCardTitle"` instead of the resolve error. So the `@safetrust/types` failure is a **build-order** artifact of calling the package script directly, and `card.tsx` is the real blocker.

### 2.5 `pnpm build`

```text
   • Packages in scope: @safetrust/api, @safetrust/graphql, @safetrust/mcp, @safetrust/types, @safetrust/web
@safetrust/api:build: src/services/wallet-readiness.ts(82,7): error TS2741: Property '_links' is missing in type 'AccountResponse' but required in type 'AccountRecord'.
@safetrust/api:build: src/services/wallet-readiness.ts(85,5): error TS2741: Property '_links' is missing in type 'AccountResponse' but required in type 'AccountRecord'.
@safetrust/api:build: src/services/wallet-readiness.ts(417,5): error TS2741: Property '_links' is missing in type 'AccountResponse' but required in type 'AccountRecord'.
@safetrust/api:build: src/services/wallet-readiness.ts(438,51): error TS18047: 'accountRecord' is possibly 'null'.
@safetrust/api:build: [ELIFECYCLE] Command failed with exit code 2.
@safetrust/web:build: [ELIFECYCLE] Command failed.

 Tasks:    2 successful, 4 total
Cached:    0 cached, 4 total
Failed:    @safetrust/api#build
```

`pnpm --filter @safetrust/web build` on its own reports:

```text
./src/components/ui/card.tsx
Error:
  x Expected ',', got 'JCardTitle'
    ,-[/home/daytona/codebase/apps/frontend/src/components/ui/card.tsx:34:1]
 37 | JCardTitle.displayName = "CardTitle";
    : ^^^^^^^^^^
> Build failed because of webpack errors
[ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL] @safetrust/web@0.1.0 build: `next build`
Exit status 1
```

So `pnpm build` has **two independent** blockers: four TypeScript errors in `apps/api/src/services/wallet-readiness.ts` (API-owned, unrelated to UI) and the `card.tsx` parse error in the web app.

### 2.6 Extra check used by the migration PR rules

`bash apps/frontend/scripts/check-client-secrets.sh` at this base:

```text
✅ E2E_WALLET flag is safe (not set in production context)
⚠️  .next/static directory not found — skipping bundle scan (run after build)

check-client-secrets: 1 passed, 0 failed
```

It passes, but the bundle scan is skipped until a successful build exists. That makes the `build` failure in §2.5 a **prerequisite** for the secret check to be meaningful — the first migration PR must not treat "1 passed" as proof that no client secret leaks.

## 3. Pre-existing defects that block verification

| File | Defect | Confirmed by |
| --- | --- | --- |
| `apps/frontend/src/components/ui/card.tsx` | stray `$` and `JCardTitle` tokens, `React.HTMLMAttributes` typo, 78 lines where the component should parse | lint, tsc, vitest, `next build` |
| `apps/frontend/src/lib/push.test.ts` | file content is base64 (0 newlines), not TypeScript | lint, tsc, vitest |
| `apps/frontend/src/components/auth/wallet/constants/wallet-kit.constant.ts` | truncated at 51 lines, ends with `walletKit = new` | vitest (two escrow suites) |
| `apps/api/src/services/wallet-readiness.ts` | `AccountResponse` missing `_links`, possibly-null `accountRecord` | `pnpm build` |
| `apps/frontend/src/lib/push.ts` (call site) | its test cannot run, so web-push registration is effectively untested | vitest |

**Out of scope for #519.** They are listed here so migration PRs do not "fix" them by accident, and so a later issue can repair them deliberately. Until `card.tsx` is repaired, no PR can claim "lint, tsc, test and build pass" — a repository-wide blocker the migration plan must schedule first (see `plan.md` P0).

## 4. Dependencies the new UI needs

`apps/frontend/package.json` is **not** changed by this PR. Each source dependency is classified as **approve** (will be added in a later PR that needs it), **replace** (use what the dApp already installs) or **drop** (not adopted).

### 4.1 Runtime dependencies

| Source dependency | dApp has | Decision | Reason |
| --- | --- | --- | --- |
| `next@^15.5.14` | `next@14.2.x` | **replace** | stay on Next 14; adapt any 15-only API in ported code |
| `react@^19.3.0`, `react-dom@^19.3.0` | `react@^18.2.0`, `react-dom@^18.2.0` | **replace** | React 18 runtime; no `use()`/React 19 form actions in ported code |
| `motion@^14.1.0` | `motion@^12.40.0` | **replace** | v12 already installed; ported components use `motion/react` + `LazyMotion`, which v12 supports |
| `firebase@^12.19.0` | `firebase@^10.0.0` | **replace** | v10 API; rewrite v12-only calls in ported auth/profile code |
| `@creit.tech/stellar-wallets-kit@^1.5.0` | `^1.9.5` | **replace** | dApp kit version wins |
| `@stellar/stellar-sdk@^14.6.1` | `^15.0.1` | **replace** | dApp SDK version wins |
| `@stellar/stellar-base@^14.1.0` | — | **drop** | no direct import; comes through `stellar-sdk` |
| `@radix-ui/*` (avatar, checkbox, dialog, dropdown-menu, label, popover, select, separator, slot, tooltip) | same packages | **replace** | use the dApp's installed versions |
| `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `date-fns`, `react-day-picker`, `react-hook-form`, `next-themes`, `sonner`, `vaul`, `recharts`, `js-cookie`, `server-only` | installed | **replace** | use existing versions |
| `@tanstack/react-query@^5`, `@tanstack/react-query-devtools@^5` | — | **drop** | only used by deferred `tw-blocks`; the dApp's data layer is Apollo |
| `@trustless-work/escrow@^2.0.8` | — | **drop** | browser SDK would bypass `apps/api`; escrow commands stay server-side |
| `@walletconnect/core@^2.26.0`, `@walletconnect/utils@^2.21.9` | — | **replace** | covered by `@creit.tech/stellar-wallets-kit` + `ethers` + `src/lib/walletconnect.ts`; no direct import in ported code |
| `axios@^1.20.0` | — | **drop** | only `tw-blocks/handle-errors/handle.ts` and the source notifications config; dApp uses `fetch` in `src/lib/api/client.ts` |
| `leaflet@^1.9.4`, `react-leaflet@^5.0.0` | — | **drop** | used by 2 map components; replaced with the static `public/img/map.svg` surface (`ListingPinMap` deferred) |
| `react-glass-ui@^1.2.2` | — | **drop** | one component (`GlassSurface`); reimplemented with the existing glass CSS |
| `zod@^3.25.76`, `@hookform/resolvers@^3.10.0` | — | **drop** | only the deferred tw-blocks escrow forms and `config/env` schemas |
| `i18next@^24`, `react-i18next@^15` | — | **drop** | no i18n in the dApp and no `t()` calls outside deferred server config |
| `jose@^5` | — | **drop** | only the source `verify-id-token` middleware |
| `react-redux@^9` | — | **drop** | no import in `src/components`, `src/app`, `src/features`, `src/hooks` |
| `@sentry/nextjs@^11` | — | **drop** | 7 source files call `captureException`; error boundaries keep the UI and lose only the report call |
| `firebase-admin@^14.5.0` | root devDependency only | **drop** | admin SDK stays in `apps/api` |
| `tailwindcss-animate@^1.0.7` | — | **approve** | config-only plugin; the ported `dialog`, `dropdown-menu` and `sheet` utilities (`animate-in`, `animate-out`) need it; one-line `tailwind.config.ts` change in the primitives PR |

### 4.2 Dev / tooling dependencies

| Source dependency | dApp has | Decision | Reason |
| --- | --- | --- | --- |
| `jest`, `jest-environment-jsdom`, `@types/jest` | Vitest + Testing Library | **replace** | port tests to Vitest (`describe`/`it`/`expect`/`vi`); no Jest runner is added |
| `@testing-library/jest-dom` | — | **replace** | Vitest + Testing Library assertions cover the ported tests; if a specific matcher is genuinely required, it is a dev-only follow-up with its own justification |
| `eslint@^9`, `eslint-config-next@^15`, `@eslint/eslintrc`, `eslint-config-prettier` | `eslint@8.57.1`, `eslint-config-next@14.2.35` | **replace** | stay on the dApp's lint stack; fix source lint violations instead of porting the ESLint 9 flat config |
| `@playwright/test@^1.64.0` | `^1.48.0` | **replace** | dApp Playwright + provisioned Testnet suite |
| `@axe-core/playwright` | — | **drop** | a11y assertions are valuable but belong to a separate test-hardening issue, not the UI port |
| `@next/bundle-analyzer` | — | **drop** | no bundle budget work in this migration |
| `husky`, `lint-staged`, `@commitlint/*`, `prettier`, `knip` | — | **drop** | dApp repo conventions; no source tooling is copied |
| `typescript@5.8.2` | `^5` (resolves 5.9.3) | **replace** | one compiler version per repo |
| `@types/node@26`, `@types/react@19`, `@types/react-dom@19` | `@types/node@^20`, `@types/react@^18` | **replace** | match React 18 / Node 20 types |
| `@types/leaflet` | — | **drop** | leaflet dropped |
| `postcss@^8`, `tailwindcss@^3.4` | `postcss@^8`, `tailwindcss@^3` | **replace** | both apps already use Tailwind 3.4; no framework change |

**Net effect on `package.json` today: none.** The only dependency a later PR is expected to add is `tailwindcss-animate` (config-only), and possibly `@testing-library/jest-dom` as a dev dependency if ported tests require it. Both need their own justification in the PR that adds them.

## 5. Reproducing this baseline

```bash
# from the repository root
node --version          # expect v22.23.2
pnpm --version          # expect 11.5.1
pnpm install --frozen-lockfile
pnpm --filter @safetrust/web lint
pnpm --filter @safetrust/web exec tsc --noEmit
pnpm --filter @safetrust/web test
pnpm build
bash apps/frontend/scripts/check-client-secrets.sh
```

Record any deviation from the table in §2 in the PR description. A migration PR that turns a **fail** into a **pass** must say so explicitly and show the output; a PR that leaves a failure untouched must name it.
