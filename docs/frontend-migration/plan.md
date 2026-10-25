# Migration plan: SafeTrust UI → `apps/frontend`

Issue: [#519](https://github.com/safetrustcr/dApp-SafeTrust/issues/519) · Source pin: `frontend-SafeTrust@c46c11593312bf0a8b9de445107293eb9a9dbea3` · Target pin: `dApp-SafeTrust@3e120c5063f8fe866d6425a471c12f49541d38ee`

The plan is derived from `inventory.md` (what each file becomes), `routes.md` (what each route becomes) and `baseline.md` (what the starting toolchain actually does). It is deliberately **ordered by dependency**, not by visual area: nothing can be verified until the baseline compiles, and no page can be ported before the primitives and the shell exist.

## 1. Non-negotiables (apply to every PR in this plan)

1. **Port presentation, keep the platform.** Components, styles and assets come over. The dApp keeps its providers, API helpers, wallet hooks, Apollo/Hasura layer and `@safetrust/*` types.
2. **Never paste** the source `package.json`, lockfile, Jest config, `.env*`, `middleware.ts` or server modules.
3. **Stay on Next 14.2 / React 18 / pnpm / Vitest.** Adapt Next 15 or React 19-only code; a framework upgrade would be its own reviewed issue.
4. **No demo data in live paths.** A field the API does not have is shown as unknown or hidden. A network error is an error state, never a fixture fallback. `@/lib/mockData/*` stays in the source repo.
5. **One source of session, wallet and escrow truth.** `useAuthUser`, `useActiveWallet`, `usePollar`, `@/lib/api/escrow.ts` — never a second copy of any of them.
6. **PR evidence:** file manifest (source → destination, copied/adapted/kept), screenshots at 360 / 768 / 1280 px in light and dark, no horizontal overflow at 320 px, and the four checks below plus the secret scan.

```bash
pnpm --filter @safetrust/web lint
pnpm --filter @safetrust/web exec tsc --noEmit
pnpm --filter @safetrust/web test
pnpm build
bash apps/frontend/scripts/check-client-secrets.sh
```

## 2. Phases

Each phase is one PR (or a small stack of PRs) and must leave `main` buildable. Phases P0–P2 are on the critical path for everything else.

### P0 — Unblock verification (no UI)

**Why first:** at the pinned base, four of the five baseline commands fail (`baseline.md` §2). No migration PR can honestly claim a green check until these are fixed.

- Repair `apps/frontend/src/components/ui/card.tsx` (stray `$`, `JCardTitle`, `React.HTMLMAttributes` typo).
- Repair or delete-and-rewrite `apps/frontend/src/lib/push.test.ts` (currently base64 text).
- Restore the truncated `apps/frontend/src/components/auth/wallet/constants/wallet-kit.constant.ts` (ends at `walletKit = new`).
- Fix `apps/api/src/services/wallet-readiness.ts` (`_links` on `AccountRecord`, null `accountRecord`) — API-owned, but it blocks `pnpm build`.
- Make `pnpm --filter @safetrust/web test` build workspace deps (document `pnpm --filter @safetrust/types build` or use turbo) so `@safetrust/types` resolves.

**Exit criteria:** all five baseline commands pass, `check-client-secrets.sh` runs its bundle scan, and `baseline.md` is updated with the new results. **No design change** in this phase.

### P1 — Foundations: tokens, primitives, helpers

- `src/app/globals.css` merge (new tokens: orange primary, sky accent, success, charts, scrollbar vars, `--radius: 0.75rem`) + `src/styles/scroball.css`.
- `tailwind.config.ts`: add `tailwindcss-animate` (approved in `baseline.md` §4.1) and the skyline keyframes/animation already used by `home/HomeSkyline`.
- UI primitives `merge` rows from `inventory.md` §5.14 (button, card, dialog, dropdown, form, input, label, popover, select, separator, sonner, table, textarea, tooltip, alert, avatar, badge, calendar) + `copy` rows (LazyMotionProvider, empty-state, icon-button, responsive-table, skeleton, demo-badge, motion-features).
- Pure helpers to port with their tests: `src/lib/format.ts`, `src/lib/export-to-csv.ts`, `src/lib/conversation-routes.ts`, `src/lib/rent/filters.ts`, `src/lib/rent/geo.ts`, `src/types/destination.ts`, plus `hooks/useInView.ts`, `hooks/useGeolocation.ts`, `hooks/useTheme.ts`.
- Add `LazyMotionProvider` + `next-themes` `ThemeProvider` inside `providers/ClientProviders.tsx` (the only provider change allowed).

**Exit criteria:** primitives render in a scratch page at 360/768/1280 in both themes; helper tests run under Vitest; no route changes.

### P2 — App shell

- `layouts/Header.tsx` (adapt: `useAuthUser` + `useActiveWallet`), `SideBar.tsx` (adapt: role-aware nav), `SearchHeader.tsx`, `PageContainer`, `PageHeader`, `nav-items.ts`.
- `dashboard/layout.tsx` stays (keep) — the new sidebar/header must fit its existing wiring, not replace it.
- Global error surfaces: `error.tsx`, `global-error.tsx`, `dashboard/error.tsx`, `not-found.tsx` (drop Sentry calls).

**Exit criteria:** every page renders with the new shell; the role gates in `routes.md` §Gate vocabulary still redirect exactly as before (assert with the middleware tests).

### P3 — Public discovery (no money paths)

Order inside the phase: home → listing (`/rent` + `/apartment`) → detail (`/apartment/[id]`).

- Home: `src/app/page.tsx` shell + `home/*` + `listings/destinations/*` + `ui/Button`. Copy `public/img/brands/*`, `public/img/destinations/*`.
- Listing: `/rent` (the live listing page) receives `components/listings/*` presentation, `useRentFilters`, `features/listings/search/*`, wired to `useRentalProperties`; `/apartment` receives the grid + `FilterSidebar` + `BedroomTabs`.
- Detail: `/apartment/[id]` receives `listings/ApartmentDetail`, `ImageGallery`, `AmenityIcons`, `SuggestionsList`, `BookingSummaryBar`, `ListingLocation`, plus the hotel detail pieces from `components/hotels/*`; the static map replaces leaflet.
- `/hotel` and `/hotel/[id]` stay redirect stubs (to `/rent` and `/apartment/[id]`); they get no UI.
- Add the redirects in `routes.md` §4 (`/hotels*`, `/rent/:id`) once the targets render.
- Wire `Header`/`SideBar` into these pages where the dApp layout expects them.

**Exit criteria:** `/`, `/rent`, `/apartment`, `/apartment/[id]` look like the new UI and read real API data; the listing pages show a real loading skeleton and a real error state (`useRentalProperties.error`); no `mockData` import remains in these routes; screenshots + 320 px check.

### P4 — Auth screens

- `/login`, `/register`, `/forgot-password` presentation merged onto dApp Firebase/Pollar behaviour.
- `auth/ui/*` (AuthMotion, Buildings, Illustration) presentation.
- Explicitly **not** ported: SEP-10 wallet sign-in button, Google sign-in, `/reset-password`, `/verify-email` (deferred in `routes.md`).

**Exit criteria:** all three flows work with a provisioned Testnet user; Pollar and wallet-kit sign-in still work; no demo credentials in code.

### P5 — Authenticated dashboard

- Guest: `/dashboard/guest`, `/dashboard/guest/suggestions` (keeps guest gate), `dashboard/guest/*`.
- Host: `/dashboard/apartments`, `/dashboard/apartments/new`, `/dashboard/hotels`, `/dashboard/hotels/[id]`, `/dashboard/hotels/[id]/edit`, `/dashboard/hotels/new`, `dashboard/analytics/*`.
- Profile: `/dashboard/profile` (`EditProfileForm`, `ProfileSettingsSidebar`, `AvatarUpload`).
- Notifications: `/dashboard/notifications` list presentation, keep `BrowserNotificationsCard` (web push).
- Keep untouched: `/dashboard/users`, `/dashboard/manager`, `/dashboard/favorites`, `/dashboard/hotels` legacy `/dashboard/hotel/**` suite, `/dashboard/escrow/create/[kind]/[id]`.

**Exit criteria:** both roles see the new dashboard; every list has loading/empty/error states; no demo rows; Apollo mutations unchanged.

### P6 — Escrow and messages (highest risk)

Escrow UI is where a visual port can quietly change money behaviour, so it is its own phase.

- Messages: `/dashboard/messages`, `/dashboard/messages/[conversationId]`, `components/messages/*` presentation over `@/lib/api/messages` + subscriptions.
- Escrow views: `escrow/views/*` presentation over Apollo `GET_ESCROW_BY_ANY_ID` + `@/lib/api/escrow.ts` commands; `/dashboard/escrow`, `/dashboard/escrow/[id]`, `/dashboard/escrow-dashboard`, and the canonical `/escrow/[id]/escrow/create` + `/escrow/[id]/escrow/[escrowId]` (the `/apartment/…` and `/hotel/…` escrow paths are redirect aliases and keep no UI).
- Keep the command path: Idempotency-Key per attempt and 409 handling in `use-escrow-action.ts`, `use-escrow-stream` status, wallet readiness checklist, Trustless Work error mapping (`@/lib/trustlesswork-errors`).
- Deferred: `tw-blocks/**`, `features/escrow/**`, `RealTimeEscrowStatus`, direct-SDK booking forms.

**Exit criteria:** the provisioned Testnet golden path still passes (guest books → funds → host releases), plus the mocked UI suite; escrow screenshots for every status view; a wallet-signed action verified end-to-end, not just rendered.

### P7 — Cleanup and parity

- Replace/remove dApp legacy components superseded by the ported ones (`components/rent/*`, `components/guest/*`) once nothing imports them.
- Decide on `/dashboard/hotel/**` (retire or keep) with the deprecation note in `routes.md`.
- Remove now-unused assets and imports; prevent duplicated shadcn primitives.
- Update `docs/frontend/architecture.md` with the final component map.

**Exit criteria:** no duplicate primitives, no dead routes, `knip`-style unused-export review, all checks green.

## 3. Sequencing rules

| Rule | Reason |
| --- | --- |
| P1 before any page | primitives and tokens are shared by every later PR |
| P2 before P3+ | `Header`/`SideBar` appear on almost every page |
| Public pages before dashboard | lower blast radius, establishes the data-adapter pattern |
| Messages before escrow | messaging is read/write but has no money movement |
| One route family per PR | keeps the file manifest and screenshots reviewable |
| Redirect only after its target renders | avoids dead ends for signed-in users |
| Never upgrade Next/React inside a UI PR | reviewability and stability |

## 4. Risks and mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Pre-existing broken files (P0) block all verification | every PR's checks are red | do P0 first, keep it design-neutral |
| Source components assume demo data shapes | invented fields in live UI | adapter per route; `unknown`/hidden for missing fields; error state on failure |
| Session divergence (source store vs dApp store) | double source of truth, auth bugs | `useAuthUser` + `useActiveWallet` only; `@/core/store/data` stays the dApp's |
| Escrow UI drift from command path | money bugs | P6 only touches presentation; commands stay in `@/lib/api/escrow.ts`; Testnet golden path required |
| `motion` v14 → v12 API gaps | animation regressions | `LazyMotion` + `m` only; visual check per page |
| Firebase v12 → v10 API gaps | auth/profile breakage | adapt calls in P2/P4; no version bump |
| React 19-only patterns (`use`, form actions) | compile errors | rewrite to React 18 patterns during port |
| Two UI systems in the tree for a while | drift, duplicate styles | phase plan + P7 cleanup gate |
| Tailwind class drift (`tailwindcss-animate`) | broken overlays | add the plugin in P1 with the primitives |
| Large PRs | review fatigue | one route family per PR; manifest required |
| JWT role gate is unverified (existing TODO) | security | out of scope; tracked separately in `routes.md` §6, do not worsen |

## 5. Rollback

Every phase ships behind no feature flag: the route itself is the switch. If a ported page regresses, revert that phase's PR — later phases depend on it only through shared primitives (P1) and the shell (P2), which are additive. Redirects in `routes.md` §4 are `permanent: false`, so they can be removed without cache damage.

## 6. Out of scope (unchanged by this plan)

- Moving any UI code: #519 is documentation only.
- Next 15 / React 19 upgrades; a component that truly needs one gets its own reviewed issue.
- Any `package.json` / lockfile change (only `.nvmrc` is added here).
- Repairing the four baseline failures (P0 is the PR that does it, not #519).
- Admin secret removal (separate issue, runs in parallel).
- Wallet/JWT security hardening.
