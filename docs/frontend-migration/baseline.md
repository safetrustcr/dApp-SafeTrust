# Frontend migration baseline

## Toolchain

| Item | Recorded value |
| --- | --- |
| dApp commit | `034fcc9cdc041e35a47fb82472b50c0d25c31b8b` |
| Source UI commit | `f42b51938d02ae15bf1aabe178f02c8bf0456486` |
| Node used for local inventory | `v24.22.1` |
| Supported migration Node baseline | `22.23.4` (`.nvmrc`; compatible with source requirement `>=20.18 <23`) |
| pnpm | `11.5.1` |
| Workspace package manager declaration | `pnpm@11.5.1` |
| Target package | `@safetrust/web` |
| Target framework/runtime | Next `15.5.x`, React `18.2.0` |
| Source framework/runtime | Next `15.5.14`, React `19.3.0` |

Node 24 was available for the local inventory only. Node 22.23.4 is pinned for
reproducible migration work because it satisfies both repositories' declared
constraints and is the CI Node baseline. A future CI run must confirm the
baseline after this commit; this issue does not upgrade Node, Next or React.

## Commands run on 2026-10-28

| Command | Result | Recorded outcome |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | pass | Workspace already up to date; pnpm `11.5.1`. |
| `pnpm --filter @safetrust/web lint` | pass with warnings | Seven existing warnings: five `@next/next/no-img-element` warnings and two `react-hooks/exhaustive-deps` warnings (`EscrowDetailView.tsx` and `use-hotel-escrow-resource.ts`). `next lint` also reports its deprecation notice. |
| `pnpm --filter @safetrust/web exec tsc --noEmit` | fail | Existing errors in auth component props, wallet modal export, `HasuraDownBanner.test.tsx` Vitest method names, and `use-wallet-bridge.test.ts` mock typing. No migration code was changed. |
| `pnpm --filter @safetrust/web test` | fail | 31 files / 223 tests passed. `HasuraDownBanner.test.tsx` has seven failures caused by obsolete Vitest method names; `use-wallet-bridge.test.ts` fails while its Firebase mock is hoisted. |
| `pnpm build` | fail | Blocked in `@safetrust/api` by existing type/import errors, including `recover-from-txhash`, escrow-state tests, pending actions, wallet readiness, and hotel reservation test fixtures. |

These failures are baseline observations, not permission to weaken checks or
silently exclude tests. They should be assigned to focused repair issues before
UI migration PRs are required to be green.

## Dependency decisions

| Category | Decision |
| --- | --- |
| Existing compatible packages | Reuse target packages and adapt source code. |
| React 19-only code | Adapt or omit; no React upgrade in a UI migration PR. |
| New visual-library dependencies | Require a dedicated approval in the consuming PR. |
| Source test/server tooling | Do not copy; retain Vitest, Testnet Playwright and `apps/api`. |
