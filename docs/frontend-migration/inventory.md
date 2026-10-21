# Frontend-SafeTrust → `apps/frontend` component inventory

Issue: [#519](https://github.com/safetrustcr/dApp-SafeTrust/issues/519) · Status: inventory complete, no code moved.

This file is the manifest every later migration PR works from. It records **what is copied, adapted, merged, kept or deferred, file by file**, and names the imports that have to be rewired before a component can render inside `@safetrust/web`.

Companion documents:

- [`routes.md`](./routes.md) — route ownership map (every dApp route and every source route).
- [`baseline.md`](./baseline.md) — pinned toolchain and the recorded results of the five baseline commands.
- [`plan.md`](./plan.md) — phased migration plan, dependency decisions, PR checklist.

## 1. Pinned revisions

| Repository | Revision | Subject | Date | Verified |
| --- | --- | --- | --- | --- |
| `safetrustcr/frontend-SafeTrust` (source UI) | `c46c11593312bf0a8b9de445107293eb9a9dbea3` | `Merge pull request #644 from AbuJulaybeeb/feat/issue-627-628-home-scrollbars-supported-by` | 2026-10-20 | Merge commit (parents `91d62fc`, `514152e`); equals `origin/main` at pin time; no unmerged draft branch |
| `safetrustcr/dApp-SafeTrust` (target, this repo) | `3e120c5063f8fe866d6425a471c12f49541d38ee` | `feat(notifications): register web push devices (#515)` | 2026-10-19 | `main` at pin time |

Every later UI-migration PR must state both revisions in its description. If the source repository moves, re-pin here **first** — do not silently copy from a newer `main`.

## 2. How the decisions were made

1. **File enumeration.** `find` over `src/components`, `src/app`, `src/features`, `src/hooks`, `src/styles` and `public/` at the pinned commit: **322 source files (319 TS/TSX/CSS + 3 README) + 86 public assets = 408 files**. One row per file below; the twelve 4-photo demo listing galleries share one row each and say so explicitly.
2. **Import scan.** Every `from "…"` / `from '…'` in the five source directories, resolved against `apps/frontend/src`. A file whose imports already exist in the dApp (for example `@/lib/utils`, `@/components/ui/button`) is never `adapt`; a file whose imports do not exist is at minimum `adapt`.
3. **Counterpart detection.** 102 source files have a byte-path twin under `apps/frontend/src`: **78 merge** (the source version carries the new look), **10 keep** (the dApp version carries the live behaviour — data, session, escrow, admin) and **14 adapt** (same path, but the imports must be rewired before the file can run).
4. **Asset hashing.** `md5sum` over `public/` against `apps/frontend/public/`: **8 identical, 78 new, 0 conflicting**. No dApp asset is overwritten.
5. **Route extraction.** `src/app/**/page.tsx` and `src/app/**/route.ts` on both sides; gates read from `apps/frontend/src/middleware.ts` and `apps/frontend/src/app/dashboard/layout.tsx`.

### Action legend

| Action | Meaning |
| --- | --- |
| `copy` | Presentation only, no rewiring: the file can land at its destination unchanged (modulo formatting). |
| `merge` | The dApp already has a file at the same path. Take the source presentation into the existing file; the dApp's exported API stays. |
| `adapt` | Presentation plus data/session/wallet/escrow imports that must be rewired to dApp modules before it can run. The fourth column names them. |
| `keep` | The dApp's own file wins. Nothing is ported from the source file (behaviour, security or data ownership reason). |
| `defer` | Explicitly out of scope for the UI migration, with the reason recorded. Not a "TBD". |

`Destination` is relative to `apps/frontend/`. `—` means the file is not ported and has no destination.

### Decision counts

| Directory | Files | copy | merge | adapt | keep | defer |
| --- | --- | --- | --- | --- | --- | --- |
| `src/app` | 62 | 4 | 16 | 20 | 7 | 15 |
| `src/components` | 220 | 53 | 68 | 61 | 2 | 36 |
| `src/features` | 22 | 5 | 0 | 7 | 0 | 10 |
| `src/hooks` | 17 | 3 | 0 | 3 | 10 | 1 |
| `src/styles` | 1 | 1 | 0 | 0 | 0 | 0 |
| `public` | 86 | 24 | 0 | 0 | 8 | 54 |
| **Total** | **408** | **90** | **84** | **91** | **27** | **116** |

> Counts were produced by walking the pinned source tree and matching every file against these tables: 408 files, 408 decisions, 0 unmatched. See §11.

## 3. Rewiring map (source import → dApp replacement)

`adapt` rows reference these entries by name. The dApp modules listed here **exist today**; the "new helper" entries are pure functions that must be ported with the component that needs them.

| Source import | Replacement in `apps/frontend` | Notes |
| --- | --- | --- |
| `@/hooks/useWallet` | `@/hooks/use-active-wallet` → `useActiveWallet()` | exposes `address` + `signAndSubmit`; also surfaces Pollar |
| `@/lib/stellar/wallet-kit`, `@/lib/auth/wallet` | `@/hooks/use-active-wallet`, `@/hooks/use-pollar`, `@/hooks/use-freighter` | the dApp's kit instance lives in `src/components/auth/wallet/constants/wallet-kit.constant.ts` |
| `@/lib/auth/session`, `@/lib/auth/persistence` | `@/lib/firebase` (`auth`, `onAuthStateChanged`) + `@/components/auth/hooks/auth.hook` (`useAuthUser`) + `@/core/store/data` | dApp session is Firebase token cookie + Pollar sync |
| `@/lib/auth/wallet-server`, `@/lib/auth/verify-id-token` | — | SEP-10 / JWT verification stays server-side: `apps/api` + dApp `app/api/auth/role-cookie` |
| `@/hooks/useCurrentUser` | `useAuthUser` (`@/components/auth/hooks/auth.hook`) | no user object duplication |
| `@/hooks/useApartmentListings`, `@/hooks/useApartments` | `@/hooks/use-rental-properties` (`useRentalProperties(kind)`) | dApp reads `/api/listings`; Apollo for dashboard queries |
| `@/hooks/useApartmentOffers` | Apollo `GET_RENTAL_OFFERS` via `@/graphql/queries/apartment-queries` | demo offers hook not ported |
| `@/lib/mockData/*` | — (no replacement) | demo arrays stay in the source repo; live paths use the real query or an empty/error state |
| `@/lib/demo`, `@/lib/demo/messages` | `@/lib/api/messages` + Apollo `GET_CONVERSATIONS` | messages are API-backed in the dApp |
| `@/lib/format`, `@/lib/formatEscrowAmount` | **new helper** `src/lib/format.ts` | pure formatting, port with its tests |
| `@/lib/conversationRoutes` | **new helper** `src/lib/conversation-routes.ts` | pure path builder |
| `@/lib/geo`, `@/lib/rent-filters` | **new helper** under `src/lib/rent/` | pure filtering/geo maths, port with tests |
| `@/lib/exportToCSV` | **new helper** `src/lib/export-to-csv.ts` | browser-only download helper |
| `@/lib/chart-utils` | `@/lib/chart-utils` | already present in the dApp, no change |
| `@/config/env`, `@/config/env.server` | `@/lib/config` | dApp config module |
| `@/types/hotel`, `@/types/apartment` | `@safetrust/types` (+ `src/@types/hotel.ts`) | shared workspace types win |
| `@/types/dashboard`, `@/types/escrow`, `@/types/booking-escrow` | `@safetrust/types` + `src/types/escrow.ts` | dApp escrow types are API-shaped |
| `@/types/destination` | **new type** in `src/types/` | destinations are UI-only metadata |
| `@/core/store/data` | `@/core/store/data` | same path in the dApp; the dApp store wins, the demo auth store is not ported |
| `@/components/tw-blocks/*` | — | not ported: escrow commands go through `@/lib/api/escrow.ts` + `@/hooks/use-escrow-action.ts` (attempt-scoped Idempotency-Keys, 409 conflict handling) |
| `@/features/escrow/*` | `@/components/booking/*` + `@/lib/api/escrow.ts` | dApp command path wins; no direct Trustless Work SDK in the browser |
| `@/providers/EscrowProviders`, `@/providers/WalletProviderScoped` | `@/providers/ClientProviders`, `@/providers/ApolloProviderWrapper` | single provider tree |
| `@tanstack/react-query` | `@apollo/client` | the dApp has no react-query; ported components must not introduce it |
| `@sentry/nextjs` | — | no Sentry in the dApp; error boundaries keep the UI, drop the reporting call |
| `motion/react`, `motion/react-m` | `motion/react` | `motion` v12 is already installed; `LazyMotionProvider` uses `LazyMotion` + `domAnimation`, both present in v12 |
| `jest`, `@jest/globals`, `jest.mock` | `vitest` (`describe`, `it`, `expect`, `vi.mock`, `vi.stubGlobal`) | every `*.test.ts(x)` row marked `adapt` refers to this entry |

## 4. `src/app` (62 files)

| Source file | Destination | Action | Imports that need adapting |
| --- | --- | --- | --- |
| `src/app/403/page.tsx` | — | defer | — · no `/403` route: the dApp middleware redirects blocked guests to `/dashboard/guest?blocked=true` |
| `src/app/api/auth/reset-password/route.ts` | — | defer | server module · the dApp keeps its Firebase reset flow and does not paste route handlers |
| `src/app/api/auth/sync-user/route.test.ts` | — | defer | server module test |
| `src/app/api/auth/sync-user/route.ts` | — | defer | server module · user provisioning belongs to `apps/api` |
| `src/app/api/auth/validate-reset-token/route.ts` | — | defer | server module |
| `src/app/api/auth/wallet/challenge/route.ts` | — | defer | SEP-10 challenge belongs in `apps/api`, not `apps/frontend` |
| `src/app/api/auth/wallet/route.ts` | — | defer | SEP-10 handshake belongs in `apps/api` |
| `src/app/api/auth/wallet/routes.test.ts` | — | defer | server module test |
| `src/app/api/auth/wallet/verify/route.ts` | — | defer | SEP-10 verification belongs in `apps/api` |
| `src/app/bookings/[bookingId]/escrow/page.tsx` | `src/app/dashboard/hotel/booking/[bookingId]/escrow/page.tsx` | merge | wallet: `useWallet` → `useActiveWallet`; escrow: booking facade → `@/lib/api/escrow.ts`; the dApp route already exists |
| `src/app/bookings/new/escrow/page.tsx` | `src/app/rent/page.tsx` | defer | wallet: `@/providers/WalletProviderScoped` → `@/providers/ClientProviders`; escrow → `@/lib/api/escrow.ts`; no booking in flight without a property id (see `routes.md`) |
| `src/app/dashboard/apartments/[id]/edit/page.tsx` | — | defer | route does not exist in the dApp; add it in a later issue once the edit mutation is agreed |
| `src/app/dashboard/apartments/[id]/offers/page.tsx` | `src/app/dashboard/apartments/[id]/offers/page.tsx` | keep | dApp page wins; `useApartmentOffers` demo hook is not ported |
| `src/app/dashboard/apartments/new/page.tsx` | `src/app/dashboard/apartments/new/page.tsx` | merge | page shell only; form data stays with `NewApartmentForm` (Apollo `CREATE_APARTMENT`) |
| `src/app/dashboard/apartments/page.tsx` | `src/app/dashboard/apartments/page.tsx` | merge | thin shell around `MyApartmentsTable`; data via Apollo |
| `src/app/dashboard/error.tsx` | `src/app/dashboard/error.tsx` | adapt | `@sentry/nextjs` → drop the capture call, keep the fallback UI |
| `src/app/dashboard/escrow-dashboard/RoleEscrowDashboardPage.tsx` | `src/app/dashboard/escrow-dashboard/RoleEscrowDashboardPage.tsx` | merge | data: `@/lib/mockData/dashboard` → dApp escrow queries; session: `useCurrentUser` → `useAuthUser` |
| `src/app/dashboard/escrow-dashboard/page.tsx` | `src/app/dashboard/escrow-dashboard/page.tsx` | keep | dApp page wins (role-gated shell) |
| `src/app/dashboard/escrow/[id]/page.tsx` | `src/app/dashboard/escrow/[id]/page.tsx` | merge | data: `@/lib/mockData/stubEscrow` → Apollo `GET_ESCROW_BY_ANY_ID` + `useEscrowStream`; helpers: `@/lib/formatEscrowAmount` → new `src/lib/format.ts` |
| `src/app/dashboard/escrow/page.tsx` | `src/app/dashboard/escrow/page.tsx` | merge | presentation only; escrow rows come from the dApp query |
| `src/app/dashboard/favorites/page.tsx` | `src/app/dashboard/favorites/page.tsx` | keep | dApp page wins: no favorites API exists, so no demo favorites are ported |
| `src/app/dashboard/guest/page.tsx` | `src/app/dashboard/guest/page.tsx` | merge | presentation only; guest gate stays in `middleware.ts` |
| `src/app/dashboard/hotels/[id]/edit/page.tsx` | `src/app/dashboard/hotels/[id]/edit/page.tsx` | adapt | form markup → `HotelForm` + `HotelImagePicker`; data: `createHotel`/`updateHotel`/`getHotelOwnerOptions` from `@/lib/api/hotels`; drop inline fetch |
| `src/app/dashboard/hotels/[id]/page.tsx` | `src/app/dashboard/hotels/[id]/page.tsx` | adapt | UI → `HotelDetailsView`; data via `@/lib/api/hotels` |
| `src/app/dashboard/hotels/new/page.tsx` | `src/app/dashboard/hotels/new/page.tsx` | adapt | form markup → `HotelForm`; data: `createHotel` from `@/lib/api/hotels`; images via `prepareImageAttachments` |
| `src/app/dashboard/hotels/page.tsx` | `src/app/dashboard/hotels/page.tsx` | merge | shell → `MyHotelsTable` (dApp API helpers) |
| `src/app/dashboard/layout.tsx` | `src/app/dashboard/layout.tsx` | keep | dApp layout wins: providers, wallet/token auth watch and sidebar wiring must not be replaced |
| `src/app/dashboard/loading.tsx` | `src/app/dashboard/loading.tsx` | copy | — |
| `src/app/dashboard/messages/[conversationId]/page.tsx` | `src/app/dashboard/messages/[conversationId]/page.tsx` | adapt | session: `useCurrentUser` → `useAuthUser`; data: `useConversation` → `@/lib/api/messages` + `SUBSCRIBE_CONVERSATION_MESSAGES` |
| `src/app/dashboard/messages/page.tsx` | `src/app/dashboard/messages/page.tsx` | adapt | data: `useConversations` → `@/lib/api/messages` + `GET_CONVERSATIONS` |
| `src/app/dashboard/notifications/layout.tsx` | `src/app/dashboard/notifications/layout.tsx` | keep | dApp layout wins (metadata only) |
| `src/app/dashboard/notifications/page.tsx` | `src/app/dashboard/notifications/page.tsx` | merge | presentation only; keep dApp `BrowserNotificationsCard` for web push |
| `src/app/dashboard/page.tsx` | `src/app/dashboard/page.tsx` | keep | dApp page wins; `middleware.ts` already redirects `/dashboard` to the role home |
| `src/app/dashboard/profile/page.tsx` | `src/app/dashboard/profile/page.tsx` | merge | shell → `EditProfileForm` + `ProfileSettingsSidebar` |
| `src/app/dashboard/users/page.tsx` | `src/app/dashboard/users/page.tsx` | keep | admin-only page wins; user provisioning is out of the UI migration |
| `src/app/error.tsx` | `src/app/error.tsx` | adapt | `@sentry/nextjs` → drop the capture call |
| `src/app/forgot-password/page.tsx` | `src/app/forgot-password/page.tsx` | merge | dApp Firebase reset behaviour wins |
| `src/app/global-error.tsx` | `src/app/global-error.tsx` | adapt | `@sentry/nextjs` → drop the capture call |
| `src/app/globals.css` | `src/app/globals.css` | merge | port the new tokens (`--primary` orange, `--accent`, `--success`, `--chart-*`, scrollbar vars, `--radius: 0.75rem`) into the dApp sheet; keep `@tailwind` layer order and add `@import "../styles/scroball.css"` |
| `src/app/guest/suggestions/page.test.tsx` | `src/app/guest/suggestions/page.test.tsx` | adapt | Jest → Vitest (`jest.mock` → `vi.mock`), keep Testing Library queries |
| `src/app/guest/suggestions/page.tsx` | `src/app/dashboard/guest/suggestions/page.tsx` | adapt | data: `@/lib/mockData/apartmentListings` → `useRentalProperties`; routes: `/guest/suggestions` → `/dashboard/guest/suggestions` (guest gate preserved) |
| `src/app/hotels/[id]/HotelDetailClient.tsx` | `src/app/apartment/[id]/HotelDetailClient.tsx` | adapt | types: `@/types/hotel` → `@safetrust/types`; data via `@/lib/api/hotels`; `/hotel/[id]` is a redirect stub, `/apartment/[id]` is canonical |
| `src/app/hotels/[id]/book/HotelBookClient.tsx` | `src/app/escrow/[id]/escrow/create/page.tsx` | adapt | wallet: `useWallet` → `useActiveWallet`; escrow: `@/features/escrow/booking-escrow.machine` → `@/lib/api/escrow.ts`; hotel checkout uses `?kind=hotel-room` on the canonical route; providers → `@/providers/ClientProviders` |
| `src/app/hotels/[id]/book/page.tsx` | — | defer | booking entry shell; `/hotels/[id]/book` redirects to `/apartment/[id]` and checkout UI lands in the canonical orchestrator in P6 |
| `src/app/hotels/[id]/page.tsx` | `src/app/apartment/[id]/page.tsx` | adapt | data: `@/lib/mockData/apartmentListings` → `@/lib/api/hotels` + `useRentalProperties`; `/apartment/[id]` is canonical |
| `src/app/hotels/page.tsx` | `src/app/rent/page.tsx` | merge | shell only; content from `HotelsView`; `/hotel` is a redirect stub to `/rent` |
| `src/app/hotels/search/page.tsx` | `src/app/rent/page.tsx` | adapt | data: `@/lib/mockData/apartmentListings` → `useRentalProperties`; search/filter state becomes client-side on `/rent` |
| `src/app/layout.tsx` | `src/app/layout.tsx` | adapt | providers: source shell → dApp `@/providers/ClientProviders` (Apollo, Firebase, Pollar); add `LazyMotionProvider` and `next-themes` `ThemeProvider` inside it; keep dApp `globals.css` import |
| `src/app/login/page.tsx` | `src/app/login/page.tsx` | merge | session: `Login` form → dApp Firebase + Pollar behaviour (`use-pollar`, `use-active-wallet`) |
| `src/app/not-found.tsx` | `src/app/not-found.tsx` | copy | — |
| `src/app/page.tsx` | `src/app/page.tsx` | merge | compose `Header` + `home/*` + `listings/destinations/*` in the dApp landing page; no data imports |
| `src/app/register/page.tsx` | `src/app/register/page.tsx` | merge | session: `Register` form → dApp `use-register-form` + `lib/auth/register-*` |
| `src/app/rent/[id]/RentalDetail.tsx` | `src/app/apartment/[id]/RentalDetail.tsx` | adapt | data: `@/lib/mockData/apartmentListings` → `useRentalProperties`/Apollo; types: `@/types/hotel` → `@safetrust/types`; links `/rent/[id]` → `/apartment/[id]` |
| `src/app/rent/[id]/escrow/[escrowId]/page.tsx` | `src/app/escrow/[id]/escrow/[escrowId]/page.tsx` | adapt | data: `@/lib/mockData/stubEscrow` → Apollo `GET_ESCROW_BY_ANY_ID` + `use-escrow-stream`; keep the `@/lib/api/escrow.ts` Idempotency-Key command path; canonical dApp route |
| `src/app/rent/[id]/escrow/create/page.tsx` | `src/app/escrow/[id]/escrow/create/page.tsx` | adapt | data: `@/lib/mockData/apartments` → `useRentalProperties`; escrow: `@/lib/api/escrow.ts` (`BookingEscrowOrchestrator`); helpers: `@/lib/format` → new `@/lib/format.ts`; canonical dApp route |
| `src/app/rent/[id]/loading.tsx` | `src/app/apartment/[id]/loading.tsx` | copy | — |
| `src/app/rent/[id]/page.tsx` | `src/app/apartment/[id]/page.tsx` | adapt | data: `@/lib/mockData/apartmentListings` → `@/lib/api/hotels`-style adapter over `useRentalProperties`; route is canonical at `/apartment/[id]` |
| `src/app/rent/loading.tsx` | `src/app/rent/loading.tsx` | copy | — |
| `src/app/rent/page.tsx` | `src/app/rent/page.tsx` | adapt | data: `@/lib/mockData/apartmentListings` → `useRentalProperties`; destinations: `@/lib/mockData/destinations` → static metadata in `src/types/destination.ts` (UI-only, copied images); helpers: `@/lib/geo` → new `src/lib/rent/geo.ts`, `@/lib/utils` exists; hooks: `useGeolocation` → ported copy |
| `src/app/reset-password/page.tsx` | — | defer | Firebase sends a hosted reset action link; the dApp has no `/reset-password` route and no token-validation API in this app |
| `src/app/room/page.tsx` | — | defer | demo aggregator page over `mockData/apartmentListings`; the real detail route is `/apartment/[id]` |
| `src/app/verify-email/page.tsx` | — | defer | the dApp verifies email through the Firebase client flow; no dedicated route |

## 5. `src/components` (220 files)

### 5.1 Root

| Source file | Destination | Action | Imports that need adapting |
| --- | --- | --- | --- |
| `src/components/DestinationCarousel.tsx` | — | defer | duplicate of `src/components/listings/destinations/DestinationCarousel.tsx`; port only the nested one |

### 5.2 `src/components/auth` (16 files)

| Source file | Destination | Action | Imports that need adapting |
| --- | --- | --- | --- |
| `src/components/auth/ForgotPasswordForm.test.tsx` | `src/components/auth/ForgotPasswordForm.test.tsx` | adapt | Jest → Vitest (`vi.mock`); firebase: `@/lib/firebase` exists, mock it with `vi.mock` |
| `src/components/auth/ForgotPasswordForm.tsx` | `src/components/auth/ForgotPasswordForm.tsx` | merge | firebase: `@/lib/firebase` same path, but v12-only calls must be rewritten for the installed v10 (`sendPasswordResetEmail`) |
| `src/components/auth/FreighterSignInButton.tsx` | — | defer | wallet: `@/hooks/useWallet` → covered by dApp `use-freighter` + wallet-kit modal; `@/lib/auth/wallet` SEP-10 is server-side (`apps/api`) |
| `src/components/auth/GoogleSignInButton.test.tsx` | — | defer | `@/lib/auth/google` has no dApp counterpart; the Google provider is not enabled |
| `src/components/auth/GoogleSignInButton.tsx` | — | defer | `@/lib/auth/google` + Firebase Google provider are not configured in the dApp |
| `src/components/auth/InvalidResetToken.tsx` | `src/components/auth/InvalidResetToken.tsx` | merge | — |
| `src/components/auth/Login.test.tsx` | `src/components/auth/Login.test.tsx` | adapt | session: `@/lib/auth/session` → Firebase auth mock; Jest → Vitest |
| `src/components/auth/Login.tsx` | `src/components/auth/Login.tsx` | merge | session: `@/lib/auth/session`, `@/lib/auth/persistence`, `@/lib/auth/redirect` → `@/lib/firebase` + `useAuthUser` + Pollar (`@/hooks/use-pollar`); store: `@/core/store/data` → dApp store; providers: `@/providers/WalletProviderScoped` → `@/providers/ClientProviders` |
| `src/components/auth/LogoutButton.tsx` | `src/components/auth/LogoutButton.tsx` | merge | session: `@/lib/auth/session` → Firebase `signOut` + dApp store reset; wallet: `@/hooks/useWallet` → `useActiveWallet`; firebase v12 calls → v10 |
| `src/components/auth/Register.tsx` | `src/components/auth/Register.tsx` | adapt | session: `@/lib/auth/session` → `@/hooks/use-register-form` + `@/lib/auth/register-user`; firebase v12 APIs → v10; `@/lib/firebase` exists |
| `src/components/auth/ResetPasswordForm.tsx` | `src/components/auth/ResetPasswordForm.tsx` | merge | — (presentation only) |
| `src/components/auth/VerifyEmail.tsx` | `src/components/auth/VerifyEmail.tsx` | merge | — |
| `src/components/auth/ui/AuthMotion.tsx` | `src/components/auth/ui/AuthMotion.tsx` | copy | `motion/react` available in motion v12; keep `LazyMotion` usage consistent with `ui/LazyMotionProvider` |
| `src/components/auth/ui/Buildings.tsx` | `src/components/auth/ui/Buildings.tsx` | merge | — |
| `src/components/auth/ui/GoogleIcon.tsx` | — | defer | only used by `GoogleSignInButton`, which is deferred |
| `src/components/auth/ui/Illustration.tsx` | `src/components/auth/ui/Illustration.tsx` | merge | — |

### 5.3 `src/components/booking` (4 files)

| Source file | Destination | Action | Imports that need adapting |
| --- | --- | --- | --- |
| `src/components/booking/BookingEscrowWrapper.tsx` | `src/components/booking/BookingEscrowWrapper.tsx` | keep | dApp wrapper wins: providers `@/providers/EscrowProviders` → dApp tree, escrow commands via `@/lib/api/escrow.ts` |
| `src/components/booking/EscrowConfirmation.tsx` | — | defer | tied to the source booking facade and escrow state machine; the dApp renders confirmation inside `EscrowDetailView` |
| `src/components/booking/EscrowCreationForm.tsx` | — | defer | posts through tw-blocks/Trustless Work SDK; the dApp creates escrows through `@/lib/api/escrow.ts` with Idempotency-Key |
| `src/components/booking/index.ts` | `src/components/booking/index.ts` | keep | dApp barrel wins |

### 5.4 `src/components/dashboard` (40 files)

| Source file | Destination | Action | Imports that need adapting |
| --- | --- | --- | --- |
| `src/components/dashboard/DashboardHeader.tsx` | `src/components/dashboard/DashboardHeader.tsx` | merge | types: `@/types/dashboard` → `@safetrust/types`; user/session data from `useAuthUser` |
| `src/components/dashboard/EscrowStatusBadge.tsx` | `src/components/dashboard/EscrowStatusBadge.tsx` | merge | — (`@/lib/utils` exists) |
| `src/components/dashboard/EscrowTable.tsx` | `src/components/dashboard/EscrowTable.tsx` | merge | types: `@/types/dashboard` → `@safetrust/types`; links → `/dashboard/escrow/[id]` |
| `src/components/dashboard/EscrowsByStatus.tsx` | `src/components/dashboard/EscrowsByStatus.tsx` | merge | types: `@/types/dashboard` → `@safetrust/types`; helpers: `@/lib/format` → new `src/lib/format.ts`; hooks: `useInView` → ported copy |
| `src/components/dashboard/NotificationItem.tsx` | `src/components/dashboard/NotificationItem.tsx` | merge | — |
| `src/components/dashboard/QuickActions.tsx` | `src/components/dashboard/QuickActions.tsx` | merge | links must point at dApp routes (`/rent`, `/dashboard/apartments/new`, `/dashboard/escrow`) |
| `src/components/dashboard/RecentActivity.tsx` | `src/components/dashboard/RecentActivity.tsx` | merge | types: `@/types/dashboard` → `@safetrust/types` |
| `src/components/dashboard/RoleEscrowDashboard.test.tsx` | `src/components/dashboard/RoleEscrowDashboard.test.tsx` | adapt | Jest → Vitest; escrow fixtures stay local to the test file |
| `src/components/dashboard/RoleEscrowDashboard.tsx` | `src/components/dashboard/RoleEscrowDashboard.tsx` | adapt | helpers: `@/lib/exportToCSV` → new `src/lib/export-to-csv.ts`, `@/lib/format` → new `src/lib/format.ts`; types: `@/types/dashboard` → `@safetrust/types`; data: escrow rows from `@/lib/api/escrow.ts` |
| `src/components/dashboard/UserProfileCard.tsx` | `src/components/dashboard/UserProfileCard.tsx` | merge | — |
| `src/components/dashboard/WalletAddressTable.tsx` | `src/components/dashboard/WalletAddressTable.tsx` | merge | — (display only; wallet addresses come from `useActiveWallet`) |
| `src/components/dashboard/WishlistCard.test.tsx` | `src/components/dashboard/WishlistCard.test.tsx` | adapt | Jest → Vitest; types: `@/types/apartment` → `@safetrust/types` |
| `src/components/dashboard/WishlistCard.tsx` | `src/components/dashboard/WishlistCard.tsx` | merge | types: `@/types/apartment` → `@safetrust/types` |
| `src/components/dashboard/README.md` | — | defer | source doc; these migration docs supersede it |
| `src/components/dashboard/analytics/AnalyticsDashboard.tsx` | `src/components/dashboard/analytics/AnalyticsDashboard.tsx` | merge | hooks: `@/hooks/use-analytics-data` exists in the dApp; `@/lib/chart-utils` exists |
| `src/components/dashboard/analytics/ChartContainer.tsx` | `src/components/dashboard/analytics/ChartContainer.tsx` | merge | — (`@/lib/chart-utils`, `@/lib/utils` exist; recharts installed) |
| `src/components/dashboard/analytics/DateRangePicker.tsx` | `src/components/dashboard/analytics/DateRangePicker.tsx` | merge | — (`date-fns`, `react-day-picker` installed) |
| `src/components/dashboard/analytics/MetricCard.tsx` | `src/components/dashboard/analytics/MetricCard.tsx` | merge | — |
| `src/components/dashboard/analytics/index.ts` | `src/components/dashboard/analytics/index.ts` | merge | — |
| `src/components/dashboard/apartments/ApartmentActionsMenu.tsx` | `src/components/apartments/ApartmentActionsMenu.tsx` | merge | destination is the dApp's existing `components/apartments/` file; links → `/dashboard/apartments/[id]/offers` |
| `src/components/dashboard/apartments/ApartmentFormFields.tsx` | `src/components/dashboard/apartments/ApartmentFormFields.tsx` | copy | — (presentation only) |
| `src/components/dashboard/apartments/ApartmentStatusBadge.tsx` | `src/components/apartments/ApartmentStatusBadge.tsx` | merge | types: `@/types/apartment` → `@safetrust/types` |
| `src/components/dashboard/apartments/BidStatusBadge.tsx` | `src/components/dashboard/apartments/BidStatusBadge.tsx` | copy | — |
| `src/components/dashboard/apartments/InterestedPeopleTable.tsx` | `src/components/dashboard/apartments/InterestedPeopleTable.tsx` | merge | keep dApp Apollo `GET_RENTAL_OFFERS` wiring; do not paste the source demo rows |
| `src/components/dashboard/apartments/MyApartmentsTable.tsx` | `src/components/dashboard/apartments/MyApartmentsTable.tsx` | merge | data: keep dApp Apollo `GET_APARTMENTS`; helpers: `@/lib/format` → new `src/lib/format.ts` |
| `src/components/dashboard/apartments/NewApartmentForm.tsx` | `src/components/dashboard/apartments/NewApartmentForm.tsx` | merge | data: `@/core/store/data` demo store → Apollo `CREATE_APARTMENT` + dApp store; images: `prepareImageAttachments` (dApp helper) |
| `src/components/dashboard/apartments/PropertySummaryHeader.tsx` | `src/components/dashboard/apartments/PropertySummaryHeader.tsx` | merge | — |
| `src/components/dashboard/guest/GuestBookingsSummary.tsx` | `src/components/dashboard/guest/GuestBookingsSummary.tsx` | merge | — |
| `src/components/dashboard/guest/GuestDashboard.test.tsx` | `src/components/dashboard/guest/GuestDashboard.test.tsx` | adapt | Jest → Vitest; `@/lib/mockData/apartmentListings` → mock `useRentalProperties` instead |
| `src/components/dashboard/guest/GuestDashboard.tsx` | `src/components/dashboard/guest/GuestDashboard.tsx` | adapt | data: `@/lib/mockData/apartmentListings` → `useRentalProperties`; types: `@/types/hotel` → `@safetrust/types` |
| `src/components/dashboard/hotels/HotelActionsMenu.tsx` | `src/components/dashboard/hotels/HotelActionsMenu.tsx` | copy | — |
| `src/components/dashboard/milestone-progress.tsx` | `src/components/dashboard/milestone-progress.tsx` | adapt | types: `@/types/dashboard` → `@safetrust/types`; escrow milestones from `@/lib/api/escrow.ts` |
| `src/components/dashboard/profile/AccountOverviewTable.tsx` | `src/components/dashboard/profile/AccountOverviewTable.tsx` | copy | — |
| `src/components/dashboard/profile/AvatarUpload.tsx` | `src/components/dashboard/profile/AvatarUpload.tsx` | copy | — |
| `src/components/dashboard/profile/EditProfileForm.tsx` | `src/components/dashboard/profile/EditProfileForm.tsx` | merge | firebase: `@/lib/firebase` same path, v12-only calls (`updateProfile`, upload) → v10 APIs; keep dApp session source |
| `src/components/dashboard/profile/ProfileSettingsSidebar.tsx` | `src/components/dashboard/profile/ProfileSettingsSidebar.tsx` | merge | — |
| `src/components/dashboard/ui/DashboardGlassCard.tsx` | `src/components/dashboard/ui/DashboardGlassCard.tsx` | copy | — (`useInView` ported alongside) |
| `src/components/dashboard/ui/DashboardReveal.tsx` | `src/components/dashboard/ui/DashboardReveal.tsx` | copy | — (`motion/react` v12 API used here is supported) |
| `src/components/dashboard/ui/GlassSurface.tsx` | `src/components/dashboard/ui/GlassSurface.tsx` | adapt | `react-glass-ui` → drop the dependency, express the surface with the existing Tailwind glass utilities in `dashboard-glass.css` |
| `src/components/dashboard/ui/dashboard-glass.css` | `src/components/dashboard/ui/dashboard-glass.css` | copy | — (import it from the components that use it, keep Tailwind layer order) |

### 5.5 `src/components/escrow` (15 files)

| Source file | Destination | Action | Imports that need adapting |
| --- | --- | --- | --- |
| `src/components/escrow/EscrowOverviewCard.tsx` | `src/components/escrow/EscrowOverviewCard.tsx` | adapt | wallet: `@/components/tw-blocks/wallet-kit/WalletProvider` → `useActiveWallet`; data: `useEscrowsBySignerQuery` → Apollo `GET_ESCROW_BY_ANY_ID` (`@/graphql/queries/escrow-queries`) + `@/hooks/use-escrow-stream` |
| `src/components/escrow/InvoiceHeader.tsx` | `src/components/escrow/InvoiceHeader.tsx` | merge | — |
| `src/components/escrow/ProcessStepper.tsx` | `src/components/escrow/ProcessStepper.tsx` | merge | — |
| `src/components/escrow/RealTimeEscrowStatus.tsx` | — | defer | built on the mock `useEscrowSubscription`; the dApp's `EscrowDetailView` already streams real status via `use-escrow-stream` |
| `src/components/escrow/views/EscrowBlockedView.tsx` | `src/components/escrow/views/EscrowBlockedView.tsx` | adapt | helpers: `@/lib/formatEscrowAmount` → new `src/lib/format.ts`; types: `@/types/escrow` → `src/types/escrow.ts` |
| `src/components/escrow/views/EscrowJustification.tsx` | `src/components/escrow/views/EscrowJustification.tsx` | copy | — |
| `src/components/escrow/views/EscrowNotesPanel.tsx` | `src/components/escrow/views/EscrowNotesPanel.tsx` | adapt | data: `useEscrowSubscription` → notes passed as props from the dApp escrow detail (Apollo `GET_ESCROW_BY_ANY_ID`); reuse the dApp `NotesPanel` field |
| `src/components/escrow/views/EscrowPaidView.tsx` | `src/components/escrow/views/EscrowPaidView.tsx` | adapt | types: `@/types/escrow` → `src/types/escrow.ts` |
| `src/components/escrow/views/EscrowPartyInfo.tsx` | `src/components/escrow/views/EscrowPartyInfo.tsx` | adapt | types: `@/types/escrow` → `src/types/escrow.ts`; party addresses from `@/lib/api/escrow.ts` |
| `src/components/escrow/views/EscrowProcessStepper.tsx` | `src/components/escrow/views/EscrowProcessStepper.tsx` | copy | — |
| `src/components/escrow/views/EscrowReleasedView.tsx` | `src/components/escrow/views/EscrowReleasedView.tsx` | merge | types: `@/types/escrow` → `src/types/escrow.ts` |
| `src/components/escrow/views/InvoiceMetadata.tsx` | `src/components/escrow/views/InvoiceMetadata.tsx` | adapt | types: `@/types/escrow` → `src/types/escrow.ts` |
| `src/components/escrow/views/PaymentBatchTable.tsx` | `src/components/escrow/views/PaymentBatchTable.tsx` | adapt | types: `@/types/escrow` → `src/types/escrow.ts` |
| `src/components/escrow/views/getViewForStatus.ts` | `src/components/escrow/views/getViewForStatus.ts` | copy | — |
| `src/components/escrow/views/index.ts` | `src/components/escrow/views/index.ts` | adapt | types: `@/types/escrow` → `src/types/escrow.ts`; export only the views that survive the merge |

### 5.6 `src/components/home` (3 files)

| Source file | Destination | Action | Imports that need adapting |
| --- | --- | --- | --- |
| `src/components/home/HomeMotion.tsx` | `src/components/home/HomeMotion.tsx` | copy | `motion/react` — v12 supports `LazyMotion`/`m`; keep `motion-features.ts` alongside |
| `src/components/home/HomeSkyline.tsx` | `src/components/home/HomeSkyline.tsx` | copy | — (inline SVG) |
| `src/components/home/SupportedBy.tsx` | `src/components/home/SupportedBy.tsx` | copy | brand SVGs from `public/img/brands/*` (copied with their `CREDITS.md`) |

### 5.7 `src/components/hotels` (13 files)

| Source file | Destination | Action | Imports that need adapting |
| --- | --- | --- | --- |
| `src/components/hotels/HotelsView.tsx` | `src/components/hotels/HotelsView.tsx` | copy | — |
| `src/components/hotels/details/Details.tsx` | `src/components/hotels/details/Details.tsx` | merge | — |
| `src/components/hotels/details/Gallery.tsx` | `src/components/hotels/details/Gallery.tsx` | merge | — |
| `src/components/hotels/details/Information.tsx` | `src/components/hotels/details/Information.tsx` | merge | — |
| `src/components/hotels/details/VerticalCarousel.tsx` | `src/components/hotels/details/VerticalCarousel.tsx` | copy | — |
| `src/components/hotels/overall/HotelBookingContainer.tsx` | `src/components/hotels/overall/HotelBookingContainer.tsx` | copy | — |
| `src/components/hotels/overall/HotelCard.tsx` | `src/components/hotels/overall/HotelCard.tsx` | adapt | types: `@/types/hotel` → `@safetrust/types`; helpers: `@/lib/format` → new `src/lib/format.ts` |
| `src/components/hotels/overall/HotelGrid.tsx` | `src/components/hotels/overall/HotelGrid.tsx` | adapt | data: `@/lib/mockData/hotelSearch` → `useRentalProperties("hotel")` |
| `src/components/hotels/overall/SearchFilters.tsx` | `src/components/hotels/overall/SearchFilters.tsx` | copy | — (URL-state only) |
| `src/components/hotels/payment/HotelDetails.tsx` | `src/components/hotels/payment/HotelDetails.tsx` | merge | — |
| `src/components/hotels/payment/Map.tsx` | `src/components/hotels/payment/Map.tsx` | adapt | `leaflet`/`react-leaflet` → replace with the dApp's static map (`public/img/map.svg`); leaflet is not added |
| `src/components/hotels/payment/ReservationSummary.tsx` | `src/components/hotels/payment/ReservationSummary.tsx` | adapt | wallet: `@/hooks/useWallet` + `@/lib/stellar/wallet-kit` → `useActiveWallet`; escrow: `@/features/escrow/BookingEscrowCheckout` + `booking-escrow.machine` → `@/lib/api/escrow.ts` |
| `src/components/hotels/search/datepicker.tsx` | `src/components/hotels/search/datepicker.tsx` | merge | — (`react-day-picker` v9 installed) |

### 5.8 `src/components/layouts` (9 files)

| Source file | Destination | Action | Imports that need adapting |
| --- | --- | --- | --- |
| `src/components/layouts/DemoBanner.tsx` | — | defer | demo-mode banner; no demo data in live paths |
| `src/components/layouts/Header.tsx` | `src/components/layouts/Header.tsx` | adapt | session: `firebase/auth` `onAuthStateChanged` + `@/lib/firebase` → `useAuthUser`; wallet: `@/hooks/useWallet` → `useActiveWallet`; UI: `@/components/ui/ThemeToggle` → dApp `@/components/ui/theme-toggle` |
| `src/components/layouts/Header.test.tsx` | `src/components/layouts/Header.test.tsx` | adapt | Jest → Vitest; mocks for `useAuthUser` and `useActiveWallet` instead of Firebase/wallet-kit |
| `src/components/layouts/PageContainer.tsx` | `src/components/layouts/PageContainer.tsx` | copy | — |
| `src/components/layouts/PageHeader.tsx` | `src/components/layouts/PageHeader.tsx` | copy | — |
| `src/components/layouts/SearchHeader.tsx` | `src/components/layouts/SearchHeader.tsx` | merge | — |
| `src/components/layouts/SideBar.tsx` | `src/components/layouts/SideBar.tsx` | merge | session: `@/hooks/useCurrentUser` → `useAuthUser`; roles: `@/lib/middleware/roles` + `@/hooks/use-hotel-role`; nav: ported `nav-items.ts` |
| `src/components/layouts/SideBar.test.tsx` | `src/components/layouts/SideBar.test.tsx` | adapt | Jest → Vitest; mock `useAuthUser` |
| `src/components/layouts/nav-items.ts` | `src/components/layouts/nav-items.ts` | copy | — (entries must stay aligned with the gates in `routes.md`) |

### 5.9 `src/components/listings` (31 files)

The new-UI listings family. Nothing at these paths exists in the dApp today; the dApp's `src/components/rent/*` and `src/components/guest/*` stay until each file is replaced.

| Source file | Destination | Action | Imports that need adapting |
| --- | --- | --- | --- |
| `src/components/listings/ActiveFilterChips.tsx` | `src/components/listings/ActiveFilterChips.tsx` | adapt | helpers: `@/lib/rent-filters` → new `src/lib/rent/filters.ts` |
| `src/components/listings/AmenityIcons.test.tsx` | `src/components/listings/AmenityIcons.test.tsx` | adapt | Jest → Vitest |
| `src/components/listings/AmenityIcons.tsx` | `src/components/listings/AmenityIcons.tsx` | adapt | types: `@/types/hotel` → `@safetrust/types` |
| `src/components/listings/ApartmentCard.test.tsx` | `src/components/listings/ApartmentCard.test.tsx` | adapt | Jest → Vitest; `@/lib/mockData/apartmentListings` → mocked `useRentalProperties` |
| `src/components/listings/ApartmentCard.tsx` | `src/components/listings/ApartmentCard.tsx` | adapt | helpers: `@/lib/conversationRoutes` → new `src/lib/conversation-routes.ts`; types: `@/types/hotel` → `@safetrust/types`; links `/rent/[id]` → `/apartment/[id]` |
| `src/components/listings/ApartmentDetail.test.tsx` | `src/components/listings/ApartmentDetail.test.tsx` | adapt | Jest → Vitest; `@/lib/mockData/apartmentListings` → mocked `useRentalProperties` |
| `src/components/listings/ApartmentDetail.tsx` | `src/components/listings/ApartmentDetail.tsx` | adapt | types: `@/types/hotel` → `@safetrust/types`; features: `@/features/listings/detail/*` → ported `BookingSummaryBar` + `ListingLocation` |
| `src/components/listings/ApartmentGrid.tsx` | `src/components/listings/ApartmentGrid.tsx` | adapt | types: `@/types/hotel` → `@safetrust/types` |
| `src/components/listings/BedroomTabs.tsx` | `src/components/listings/BedroomTabs.tsx` | adapt | data: `@/lib/mockData/apartmentListings` → `useRentalProperties` |
| `src/components/listings/FilterSidebar.tsx` | `src/components/listings/FilterSidebar.tsx` | copy | — |
| `src/components/listings/HotelHeader.test.tsx` | `src/components/listings/HotelHeader.test.tsx` | adapt | Jest → Vitest |
| `src/components/listings/HotelHeader.tsx` | `src/components/listings/HotelHeader.tsx` | copy | — |
| `src/components/listings/ImageGallery.tsx` | `src/components/listings/ImageGallery.tsx` | copy | — |
| `src/components/listings/ListingPrice.test.tsx` | `src/components/listings/ListingPrice.test.tsx` | adapt | Jest → Vitest |
| `src/components/listings/ListingPrice.tsx` | `src/components/listings/ListingPrice.tsx` | copy | — |
| `src/components/listings/NearMeButton.tsx` | `src/components/listings/NearMeButton.tsx` | copy | hooks: `@/hooks/useGeolocation` → ported copy |
| `src/components/listings/RentFiltersPanel.tsx` | `src/components/listings/RentFiltersPanel.tsx` | copy | — |
| `src/components/listings/RentMotion.tsx` | `src/components/listings/RentMotion.tsx` | copy | — `motion/react` v12 |
| `src/components/listings/SuggestionCard.tsx` | `src/components/listings/SuggestionCard.tsx` | adapt | helpers: `@/lib/conversationRoutes` → new `src/lib/conversation-routes.ts`; links → dApp conversation routes |
| `src/components/listings/SuggestionsList.tsx` | `src/components/listings/SuggestionsList.tsx` | adapt | types: `@/types/hotel` → `@safetrust/types` |
| `src/components/listings/destinations/CategoryFilterRow.test.tsx` | `src/components/listings/destinations/CategoryFilterRow.test.tsx` | adapt | Jest → Vitest |
| `src/components/listings/destinations/CategoryFilterRow.tsx` | `src/components/listings/destinations/CategoryFilterRow.tsx` | copy | — |
| `src/components/listings/destinations/DestinationCard.test.tsx` | `src/components/listings/destinations/DestinationCard.test.tsx` | adapt | Jest → Vitest; types: `@/types/destination` → new `src/types/destination.ts` |
| `src/components/listings/destinations/DestinationCard.tsx` | `src/components/listings/destinations/DestinationCard.tsx` | adapt | types: `@/types/destination` → new `src/types/destination.ts` |
| `src/components/listings/destinations/DestinationCarousel.tsx` | `src/components/listings/destinations/DestinationCarousel.tsx` | adapt | types: `@/types/destination` → new `src/types/destination.ts`; images `/img/destinations/*` (copied) |
| `src/components/listings/filters/applyRentFilters.test.ts` | `src/components/listings/filters/applyRentFilters.test.ts` | adapt | Jest → Vitest; `@/lib/mockData/apartmentListings` → local fixtures inside the test |
| `src/components/listings/filters/applyRentFilters.ts` | `src/components/listings/filters/applyRentFilters.ts` | adapt | types: `@/types/hotel` → `@safetrust/types` |
| `src/components/listings/filters/useRentFilters.test.ts` | `src/components/listings/filters/useRentFilters.test.ts` | adapt | Jest → Vitest; `@/features/listings` barrel → ported modules |
| `src/components/listings/filters/useRentFilters.ts` | `src/components/listings/filters/useRentFilters.ts` | adapt | data: `@/lib/mockData/apartmentListings` → `useRentalProperties`; helpers: `@/lib/rent-filters` → new `src/lib/rent/filters.ts`; Next 14 `useSearchParams` unchanged |
| `src/components/listings/formatListingPrice.ts` | `src/components/listings/formatListingPrice.ts` | adapt | helpers: `@/lib/format` → new `src/lib/format.ts` |
| `src/components/listings/index.ts` | `src/components/listings/index.ts` | adapt | barrel: re-export only ported modules; types: `@/types/hotel`, `@/types/hotel-booking` → `@safetrust/types` |

### 5.10 `src/components/messages` (9 files)

| Source file | Destination | Action | Imports that need adapting |
| --- | --- | --- | --- |
| `src/components/messages/AutomatedEventMessage.tsx` | `src/components/messages/AutomatedEventMessage.tsx` | merge | — |
| `src/components/messages/ConversationList.test.tsx` | `src/components/messages/ConversationList.test.tsx` | adapt | Jest → Vitest; `@/lib/demo/messages` → local fixtures |
| `src/components/messages/ConversationList.tsx` | `src/components/messages/ConversationList.tsx` | merge | data: dApp `@/lib/api/messages`; links → dApp `/dashboard/messages/[conversationId]` |
| `src/components/messages/ConversationThread.tsx` | `src/components/messages/ConversationThread.tsx` | merge | — |
| `src/components/messages/MessageBubble.tsx` | `src/components/messages/MessageBubble.tsx` | merge | — |
| `src/components/messages/MessageComposer.test.tsx` | `src/components/messages/MessageComposer.test.tsx` | adapt | Jest → Vitest |
| `src/components/messages/MessageComposer.tsx` | `src/components/messages/MessageComposer.tsx` | merge | send path: dApp `@/lib/api/messages` (not the source demo store) |
| `src/components/messages/UnreadBadge.test.tsx` | `src/components/messages/UnreadBadge.test.tsx` | adapt | Jest → Vitest |
| `src/components/messages/UnreadBadge.tsx` | `src/components/messages/UnreadBadge.tsx` | merge | — |

### 5.11 `src/components/navigation` (3 files)

| Source file | Destination | Action | Imports that need adapting |
| --- | --- | --- | --- |
| `src/components/navigation/BackButton.tsx` | `src/components/navigation/BackButton.tsx` | copy | — (Next 14 `useRouter` API identical) |
| `src/components/navigation/Breadcrumbs.tsx` | `src/components/navigation/Breadcrumbs.tsx` | copy | — |
| `src/components/navigation/NavigationHeader.tsx` | — | defer | superseded by `components/layouts/Header` (dApp `Header` wins) |

### 5.12 `src/components/rooms` (24 files)

| Source file | Destination | Action | Imports that need adapting |
| --- | --- | --- | --- |
| `src/components/rooms/actions/ContactButton.tsx` | `src/components/rooms/actions/ContactButton.tsx` | adapt | helpers: `@/lib/conversationRoutes` → new `src/lib/conversation-routes.ts`; conversation creation via `@/lib/api/messages` |
| `src/components/rooms/actions/FavoriteButton.tsx` | `src/components/rooms/actions/FavoriteButton.tsx` | adapt | no favorites API in the dApp: render the disabled/empty state used by `/dashboard/favorites`, do not persist demo favorites |
| `src/components/rooms/actions/ReportButton.tsx` | — | defer | no report endpoint in `apps/api` |
| `src/components/rooms/actions/RoomActionBar.tsx` | `src/components/rooms/actions/RoomActionBar.tsx` | copy | — |
| `src/components/rooms/actions/ShareButton.tsx` | `src/components/rooms/actions/ShareButton.tsx` | copy | — |
| `src/components/rooms/booking/AvailabilityChecker.tsx` | — | defer | demo availability calendar; real availability is served by `apps/api` |
| `src/components/rooms/booking/BookingButton.tsx` | `src/components/rooms/booking/BookingButton.tsx` | adapt | wallet: `@/hooks/useWallet` + `@/lib/stellar/wallet-kit` → `useActiveWallet`; escrow: `@/features/escrow/*` → `@/lib/api/escrow.ts` |
| `src/components/rooms/booking/BookingConfirmation.tsx` | `src/components/rooms/booking/BookingConfirmation.tsx` | adapt | links → dApp escrow route `/escrow/[id]/escrow/[escrowId]` (`?kind=hotel-room` for hotels) |
| `src/components/rooms/booking/CustomDateRangePicker.tsx` | `src/components/rooms/booking/CustomDateRangePicker.tsx` | copy | — |
| `src/components/rooms/booking/MobileBookingCard.tsx` | `src/components/rooms/booking/MobileBookingCard.tsx` | adapt | quote: `@/features/escrow/pricing` → server quote via `@/lib/api/escrow.ts` |
| `src/components/rooms/booking/PriceCalculator.tsx` | `src/components/rooms/booking/PriceCalculator.tsx` | adapt | pricing: `@/features/escrow/pricing` → price breakdown returned by `apps/api` (no client-side duplication) |
| `src/components/rooms/booking/RoomBookingCard.tsx` | `src/components/rooms/booking/RoomBookingCard.tsx` | adapt | escrow: `@/features/escrow/booking-escrow.machine` → `@/lib/api/escrow.ts` command flow |
| `src/components/rooms/cards/AmenitiesCard.tsx` | `src/components/rooms/cards/AmenitiesCard.tsx` | copy | — |
| `src/components/rooms/cards/HostCard.tsx` | `src/components/rooms/cards/HostCard.tsx` | copy | — |
| `src/components/rooms/cards/LocationCard.tsx` | `src/components/rooms/cards/LocationCard.tsx` | copy | — |
| `src/components/rooms/cards/PolicyCard.tsx` | `src/components/rooms/cards/PolicyCard.tsx` | copy | — |
| `src/components/rooms/cards/RoomDetailsCard.tsx` | `src/components/rooms/cards/RoomDetailsCard.tsx` | copy | — |
| `src/components/rooms/cards/index.ts` | `src/components/rooms/cards/index.ts` | copy | — |
| `src/components/rooms/gallery/AdditionalRoomPhotos.tsx` | `src/components/rooms/gallery/AdditionalRoomPhotos.tsx` | copy | — |
| `src/components/rooms/gallery/FullscreenImageViewer.tsx` | `src/components/rooms/gallery/FullscreenImageViewer.tsx` | copy | — |
| `src/components/rooms/gallery/ImageCarousel.tsx` | `src/components/rooms/gallery/ImageCarousel.tsx` | copy | — |
| `src/components/rooms/gallery/RoomPhotos.tsx` | `src/components/rooms/gallery/RoomPhotos.tsx` | copy | — |
| `src/components/rooms/gallery/ThumbnailNavigation.tsx` | `src/components/rooms/gallery/ThumbnailNavigation.tsx` | copy | — |
| `src/components/rooms/index.ts` | `src/components/rooms/index.ts` | adapt | barrel: re-export only ported modules |

### 5.13 `src/components/tw-blocks` (23 files)

Trustless Work blocks talk to the escrow API directly from the browser. The dApp deliberately keeps escrow commands behind `apps/api` + `@/lib/api/escrow.ts` (`use-escrow-action.ts` issues attempt-scoped Idempotency-Keys and handles 409 conflicts), so **the entire tree is deferred**; per-file rows are still recorded so later issues do not re-litigate it.

| Source file | Destination | Action | Imports that need adapting |
| --- | --- | --- | --- |
| `src/components/tw-blocks/README.md` | — | defer | describes direct-SDK usage the dApp does not adopt |
| `src/components/tw-blocks/escrows/milestone-callbacks.test.tsx` | — | defer | `@trustless-work/escrow/types` — dropped dependency |
| `src/components/tw-blocks/escrows/multi-release/approve-milestone/ApproveMilestone.tsx` | — | defer | escrow: `useEscrowsMutations` → `@/lib/api/escrow.ts`; wallet: tw-blocks `WalletProvider` → `useActiveWallet` |
| `src/components/tw-blocks/escrows/multi-release/change-milestone-status/ChangeMilestoneStatus.tsx` | — | defer | escrow: `useEscrowsMutations` → `@/lib/api/escrow.ts` |
| `src/components/tw-blocks/escrows/multi-release/initialize-escrow/form/InitializeEscrow.tsx` | — | defer | escrow: `@/lib/api/escrow.ts`; trustlines: `wallet-kit/trustlines` → `@/lib/api/escrow.ts` `buildTrustlineXdr` |
| `src/components/tw-blocks/escrows/multi-release/initialize-escrow/form/schema.ts` | — | defer | `zod` schema used only by the direct-SDK form |
| `src/components/tw-blocks/escrows/multi-release/initialize-escrow/form/useInitializeEscrow.ts` | — | defer | escrow: `useEscrowsMutations` → `@/lib/api/escrow.ts`; wallet: tw-blocks `WalletProvider` → `useActiveWallet` |
| `src/components/tw-blocks/escrows/single-release/initialize-escrow/form/InitializeEscrow.tsx` | — | defer | same as the multi-release form |
| `src/components/tw-blocks/escrows/single-release/initialize-escrow/form/schema.ts` | — | defer | `zod` schema used only by the direct-SDK form |
| `src/components/tw-blocks/escrows/single-release/initialize-escrow/form/useInitializeEscrow.ts` | — | defer | escrow: `useEscrowsMutations` → `@/lib/api/escrow.ts` |
| `src/components/tw-blocks/escrows/useInitializeEscrow.reset.test.tsx` | — | defer | tests the deferred form |
| `src/components/tw-blocks/handle-errors/errors.enum.ts` | — | defer | only used by the deferred blocks |
| `src/components/tw-blocks/handle-errors/handle.ts` | — | defer | `axios` → the dApp uses `fetch` in `@/lib/api/client.ts` |
| `src/components/tw-blocks/providers/EscrowProvider.tsx` | — | defer | `@trustless-work/escrow/types` — the dApp provider tree stays |
| `src/components/tw-blocks/providers/TrustlessWork.tsx` | — | defer | `@trustless-work/escrow` SDK provider + `@/config/env` |
| `src/components/tw-blocks/tanstack/useEscrowsBySignerQuery.ts` | — | defer | `@tanstack/react-query` + `@trustless-work/escrow` → Apollo/`@/lib/api/escrow.ts` |
| `src/components/tw-blocks/tanstack/useEscrowsMutations.ts` | — | defer | `@tanstack/react-query` + `@trustless-work/escrow` → `@/lib/api/escrow.ts` |
| `src/components/tw-blocks/wallet-kit/WalletProvider.test.tsx` | — | defer | tests the deferred provider |
| `src/components/tw-blocks/wallet-kit/WalletProvider.tsx` | — | defer | replaced by `@/hooks/use-active-wallet` |
| `src/components/tw-blocks/wallet-kit/trustlines.ts` | — | defer | trustline XDR already exists as `buildTrustlineXdr` in `@/lib/api/escrow.ts` |
| `src/components/tw-blocks/wallet-kit/validators.ts` | — | defer | used only by the deferred forms |
| `src/components/tw-blocks/wallet-kit/wallet-kit.shared.test.ts` | — | defer | tests the deferred kit wrapper |
| `src/components/tw-blocks/wallet-kit/wallet-kit.ts` | — | defer | wrapper over `@/lib/stellar/wallet-kit`; dApp kit module wins |

### 5.14 `src/components/ui` (29 files)

| Source file | Destination | Action | Imports that need adapting |
| --- | --- | --- | --- |
| `src/components/ui/LazyMotionProvider.tsx` | `src/components/ui/LazyMotionProvider.tsx` | copy | — `motion/react` v12 |
| `src/components/ui/ThemeToggle.tsx` | `src/components/ui/theme-toggle.tsx` | merge | destination is the dApp's existing toggle; `next-themes` already installed |
| `src/components/ui/alert.tsx` | `src/components/ui/alert.tsx` | merge | — |
| `src/components/ui/avatar.tsx` | `src/components/ui/avatar.tsx` | merge | — |
| `src/components/ui/badge.tsx` | `src/components/ui/badge.tsx` | merge | — |
| `src/components/ui/button.tsx` | `src/components/ui/button.tsx` | merge | — (sky palette + `asChild` API unchanged) |
| `src/components/ui/calendar.tsx` | `src/components/ui/calendar.tsx` | merge | — (`react-day-picker` v9) |
| `src/components/ui/card.tsx` | `src/components/ui/card.tsx` | merge | — · the dApp file is syntactically broken at the pinned base commit (see `baseline.md`); this merge repairs it |
| `src/components/ui/checkbox.tsx` | `src/components/ui/checkbox.tsx` | merge | — |
| `src/components/ui/demo-badge.tsx` | `src/components/ui/demo-badge.tsx` | copy | — (only rendered by deferred demo surfaces until they are retired) |
| `src/components/ui/dialog.tsx` | `src/components/ui/dialog.tsx` | merge | needs the `tailwindcss-animate` plugin for `animate-in`/`animate-out` utilities (approved) |
| `src/components/ui/dropdown-menu.tsx` | `src/components/ui/dropdown-menu.tsx` | merge | needs the `tailwindcss-animate` plugin |
| `src/components/ui/empty-state.tsx` | `src/components/ui/empty-state.tsx` | copy | — |
| `src/components/ui/form.tsx` | `src/components/ui/form.tsx` | merge | — (`react-hook-form` 7 already installed) |
| `src/components/ui/icon-button.tsx` | `src/components/ui/icon-button.tsx` | copy | — |
| `src/components/ui/input.tsx` | `src/components/ui/input.tsx` | merge | — |
| `src/components/ui/label.tsx` | `src/components/ui/label.tsx` | merge | — |
| `src/components/ui/motion-features.ts` | `src/components/ui/motion-features.ts` | copy | — `motion/react` v12 |
| `src/components/ui/popover.tsx` | `src/components/ui/popover.tsx` | merge | — |
| `src/components/ui/responsive-table.test.tsx` | `src/components/ui/responsive-table.test.tsx` | adapt | Jest → Vitest |
| `src/components/ui/responsive-table.tsx` | `src/components/ui/responsive-table.tsx` | copy | — |
| `src/components/ui/select.tsx` | `src/components/ui/select.tsx` | merge | — |
| `src/components/ui/separator.tsx` | `src/components/ui/separator.tsx` | merge | — |
| `src/components/ui/skeleton.tsx` | `src/components/ui/skeleton.tsx` | copy | — |
| `src/components/ui/sonner.tsx` | `src/components/ui/sonner.tsx` | merge | — (`next-themes` + `sonner` installed) |
| `src/components/ui/table.tsx` | `src/components/ui/table.tsx` | merge | — |
| `src/components/ui/textarea.tsx` | `src/components/ui/textarea.tsx` | merge | — |
| `src/components/ui/tooltip.tsx` | `src/components/ui/tooltip.tsx` | merge | — |
| `src/components/ui/widget-boundary.tsx` | `src/components/ui/widget-boundary.tsx` | adapt | `@sentry/nextjs` → drop the capture call, keep the error boundary |

## 6. `src/features` (22 files)

| Source file | Destination | Action | Imports that need adapting |
| --- | --- | --- | --- |
| `src/features/escrow/BookingEscrowCheckout.test.tsx` | — | defer | tests the deferred checkout; escrow checkout UI stays inside `components/escrow/views` |
| `src/features/escrow/BookingEscrowCheckout.tsx` | — | defer | escrow: source machine → `@/lib/api/escrow.ts`; wallet: `useWallet` → `useActiveWallet` |
| `src/features/escrow/README.md` | — | defer | documents the direct-SDK booking flow the dApp does not adopt |
| `src/features/escrow/booking-escrow.machine.test.ts` | — | defer | tests the deferred state machine |
| `src/features/escrow/booking-escrow.machine.ts` | — | defer | escrow: `@trustless-work/escrow/types` → server-driven state from `@/lib/api/escrow.ts`; the dApp's `apps/api` domain owns transitions |
| `src/features/escrow/config.ts` | — | defer | escrow: `@trustless-work/escrow` + trustlines → `@/lib/api/escrow.ts`; network `@/lib/stellar/network` → `@/lib/config` |
| `src/features/escrow/pricing.ts` | — | defer | quote maths must come from `apps/api`, not be duplicated in the client |
| `src/features/escrow/useBookingEscrow.test.tsx` | — | defer | tests the deferred hook |
| `src/features/escrow/useBookingEscrow.ts` | — | defer | escrow: `useEscrowsMutations` → `@/lib/api/escrow.ts`; wallet: `useWallet` → `useActiveWallet`; keep Idempotency-Key semantics from the dApp |
| `src/features/listings/detail/BookingSummaryBar.test.tsx` | `src/features/listings/detail/BookingSummaryBar.test.tsx` | adapt | Jest → Vitest; `@/lib/mockData/apartmentListings` → mocked `useRentalProperties` |
| `src/features/listings/detail/BookingSummaryBar.tsx` | `src/features/listings/detail/BookingSummaryBar.tsx` | adapt | types: `@/types/hotel` → `@safetrust/types`; escrow CTA: source booking route → dApp `/escrow/[id]/escrow/create` (`?kind=hotel-room` for hotels) |
| `src/features/listings/detail/ListingLocation.test.tsx` | `src/features/listings/detail/ListingLocation.test.tsx` | adapt | Jest → Vitest; mockData → local fixtures |
| `src/features/listings/detail/ListingLocation.tsx` | `src/features/listings/detail/ListingLocation.tsx` | adapt | types: `@/types/hotel` → `@safetrust/types` |
| `src/features/listings/index.ts` | `src/features/listings/index.ts` | copy | — (barrel; add exports as modules land) |
| `src/features/listings/map/BaseMap.tsx` | `src/features/listings/map/BaseMap.tsx` | copy | — (no map library import) |
| `src/features/listings/map/ListingPinMap.tsx` | — | defer | `leaflet`/`react-leaflet` are not added; the dApp shows a static map image |
| `src/features/listings/search/date-only.test.ts` | `src/features/listings/search/date-only.test.ts` | adapt | Jest → Vitest (`describe`/`it`/`expect` unchanged) |
| `src/features/listings/search/date-only.ts` | `src/features/listings/search/date-only.ts` | copy | — (pure) |
| `src/features/listings/search/stay-search.test.ts` | `src/features/listings/search/stay-search.test.ts` | adapt | Jest → Vitest |
| `src/features/listings/search/stay-search.ts` | `src/features/listings/search/stay-search.ts` | copy | — (pure URL contract) |
| `src/features/listings/search/useStaySearch.test.ts` | `src/features/listings/search/useStaySearch.test.ts` | adapt | Jest → Vitest; mock `next/navigation` with `vi.mock` |
| `src/features/listings/search/useStaySearch.ts` | `src/features/listings/search/useStaySearch.ts` | copy | — (Next 14 `useRouter`/`useSearchParams` compatible) |

## 7. `src/hooks` (17 files)

| Source file | Destination | Action | Imports that need adapting |
| --- | --- | --- | --- |
| `src/hooks/index.ts` | `src/hooks/index.ts` | adapt | barrel: re-export only the hooks that are ported (`useGeolocation`, `useInView`, `useTheme`) |
| `src/hooks/use-analytics-data.ts` | `src/hooks/use-analytics-data.ts` | keep | dApp hook wins (`@/lib/chart-utils` already shared) |
| `src/hooks/useApartmentListings.ts` | — | keep | demo array hook: `@/hooks/use-rental-properties` wins, demo data is not ported |
| `src/hooks/useApartmentOffers.ts` | — | keep | demo hook: Apollo `GET_RENTAL_OFFERS` wins |
| `src/hooks/useApartments.ts` | — | keep | demo hook: Apollo `GET_APARTMENTS` wins |
| `src/hooks/useBookingEscrow.ts` | — | keep | dApp `@/hooks/use-escrow-action` + `@/lib/api/escrow.ts` win |
| `src/hooks/useConversation.ts` | — | keep | dApp `@/lib/api/messages` + subscription win |
| `src/hooks/useConversations.ts` | — | keep | dApp `@/lib/api/messages` wins |
| `src/hooks/useCurrentUser.ts` | — | keep | `useAuthUser` (`@/components/auth/hooks/auth.hook`) wins |
| `src/hooks/useEscrowSubscription.ts` | — | keep | dApp `@/hooks/use-escrow-stream` wins; source hook is mock-driven |
| `src/hooks/useGeolocation.test.ts` | `src/hooks/useGeolocation.test.ts` | adapt | Jest → Vitest; stub `navigator.geolocation` with `vi.stubGlobal` |
| `src/hooks/useGeolocation.ts` | `src/hooks/useGeolocation.ts` | copy | — (browser API + `@/types/destination` → new `src/types/destination.ts`) |
| `src/hooks/useInView.test.tsx` | `src/hooks/useInView.test.tsx` | adapt | Jest → Vitest; `IntersectionObserver` stub via `vi.stubGlobal` |
| `src/hooks/useInView.ts` | `src/hooks/useInView.ts` | copy | — |
| `src/hooks/useTheme.ts` | `src/hooks/useTheme.ts` | copy | — (`next-themes` installed; keeps glass surfaces and the header toggle in sync) |
| `src/hooks/useWallet.test.tsx` | — | defer | tests the source wallet hook; dApp wallet behaviour is covered by `use-active-wallet` during the wallet PR |
| `src/hooks/useWallet.ts` | — | keep | `@/hooks/use-active-wallet` + `@/hooks/use-pollar` win; do not add a second wallet source |

## 8. `src/styles` (1 file)

| Source file | Destination | Action | Imports that need adapting |
| --- | --- | --- | --- |
| `src/styles/scroball.css` | `src/styles/scroball.css` | copy | — (imported from `globals.css`; keep the `--scrollbar-*` tokens that the merge adds) |

## 9. `public` (86 files)

Asset decisions were made with `md5sum` against `apps/frontend/public`: **8 identical, 78 new, 0 conflicting**. One row per asset; the 48 demo listing photos are grouped four-at-a-time by their folder because every photo in a folder shares the same decision.

| Source file(s) | Destination | Action | Imports that need adapting |
| --- | --- | --- | --- |
| `public/.well-known/stellar.toml` | — | defer | network metadata, not UI; stays with infra/network config |
| `public/img/avatars/alberto.webp` | — | defer | demo testimonial avatar; no live source |
| `public/img/avatars/luis.webp` | — | defer | demo testimonial avatar; no live source |
| `public/img/avatars/maria.webp` | — | defer | demo testimonial avatar; no live source |
| `public/img/avatars/randall.webp` | — | defer | demo testimonial avatar; no live source |
| `public/img/brands/drips-dark.svg` | `public/img/brands/drips-dark.svg` | copy | — (used by `home/SupportedBy`) |
| `public/img/brands/drips-light.svg` | `public/img/brands/drips-light.svg` | copy | — |
| `public/img/brands/stellar-mark-black.svg` | `public/img/brands/stellar-mark-black.svg` | copy | — |
| `public/img/brands/stellar-mark-white.svg` | `public/img/brands/stellar-mark-white.svg` | copy | — |
| `public/img/brands/trustless-work-dark.svg` | `public/img/brands/trustless-work-dark.svg` | copy | — |
| `public/img/brands/trustless-work-light.svg` | `public/img/brands/trustless-work-light.svg` | copy | — |
| `public/img/brands/CREDITS.md` | `public/img/brands/CREDITS.md` | copy | — (licence record must ship with the assets) |
| `public/img/buildings.png` | `public/img/buildings.png` | keep | identical hash; dApp file wins |
| `public/img/destinations/alajuela.webp` | `public/img/destinations/alajuela.webp` | copy | — (used by `listings/destinations/*`) |
| `public/img/destinations/cartago.webp` | `public/img/destinations/cartago.webp` | copy | — |
| `public/img/destinations/guanacaste.webp` | `public/img/destinations/guanacaste.webp` | copy | — |
| `public/img/destinations/heredia.webp` | `public/img/destinations/heredia.webp` | copy | — |
| `public/img/destinations/limon.webp` | `public/img/destinations/limon.webp` | copy | — |
| `public/img/destinations/puntarenas.webp` | `public/img/destinations/puntarenas.webp` | copy | — |
| `public/img/destinations/san-jose.webp` | `public/img/destinations/san-jose.webp` | copy | — |
| `public/img/destinations/CREDITS.md` | `public/img/destinations/CREDITS.md` | copy | — |
| `public/img/hotel/hotel1.jpg` | `public/img/hotel/hotel1.jpg` | keep | identical hash |
| `public/img/hotel/hotel2.jpg` | `public/img/hotel/hotel2.jpg` | copy | — |
| `public/img/hotel/hotel3.jpg` | `public/img/hotel/hotel3.jpg` | copy | — |
| `public/img/hotel/hotel4.jpg` | `public/img/hotel/hotel4.jpg` | copy | — |
| `public/img/hotels.png` | `public/img/hotels.png` | keep | identical hash |
| `public/img/listings/1/*.webp` (4 files) | — | defer | demo listing gallery tied to `@/lib/mockData`; live galleries come from Hasura `hotel_images` |
| `public/img/listings/2/*.webp` (4 files) | — | defer | demo listing gallery |
| `public/img/listings/3/*.webp` (4 files) | — | defer | demo listing gallery |
| `public/img/listings/4/*.webp` (4 files) | — | defer | demo listing gallery |
| `public/img/listings/5/*.webp` (4 files) | — | defer | demo listing gallery |
| `public/img/listings/6/*.webp` (4 files) | — | defer | demo listing gallery |
| `public/img/listings/7/*.webp` (4 files) | — | defer | demo listing gallery |
| `public/img/listings/8/*.webp` (4 files) | — | defer | demo listing gallery |
| `public/img/listings/9/*.webp` (4 files) | — | defer | demo listing gallery |
| `public/img/listings/10/*.webp` (4 files) | — | defer | demo listing gallery |
| `public/img/listings/11/*.webp` (4 files) | — | defer | demo listing gallery |
| `public/img/listings/12/*.webp` (4 files) | — | defer | demo listing gallery |
| `public/img/listings/CREDITS.md` | — | defer | credits apply only to the deferred demo photos |
| `public/img/logo.png` | `public/img/logo.png` | keep | identical hash |
| `public/img/map.svg` | `public/img/map.svg` | copy | — (static map surface that replaces leaflet) |
| `public/img/person.jpg` | `public/img/person.jpg` | copy | — |
| `public/img/placeholder.svg` | `public/img/placeholder.svg` | copy | — |
| `public/img/room1.png` | `public/img/room1.png` | keep | identical hash |
| `public/img/room2.png` | `public/img/room2.png` | keep | identical hash |
| `public/img/room3.png` | `public/img/room3.png` | copy | — |
| `public/img/room4.png` | `public/img/room4.png` | copy | — |
| `public/img/user-female.jpg` | `public/img/user-female.jpg` | keep | identical hash |
| `public/img/wallet/freighter.svg` | `public/img/wallet/freighter.svg` | copy | — |
| `public/img/wallet/stellar.png` | `public/img/wallet/stellar.png` | keep | identical hash |

## 10. dApp-only files that are kept as they are

These have no source counterpart. They are listed so later PRs do not delete them by accident.

| Area | Files kept | Why |
| --- | --- | --- |
| Auth and wallet | `components/auth/hooks/auth.hook.ts`, `components/auth/pollar/*`, `components/auth/wallet/**`, `hooks/use-active-wallet.ts`, `hooks/use-pollar.ts`, `hooks/use-freighter.ts`, `lib/firebase.ts` | live Firebase + Pollar + wallet-kit session |
| Data layer | `lib/api/*`, `lib/graphql/queries/*`, `lib/subscription-client.ts`, `providers/ApolloProviderWrapper.tsx`, `providers/ClientProviders.tsx`, `hooks/use-escrow-action.ts`, `hooks/use-escrow-stream.ts`, `hooks/use-hotel-dashboard-data.ts`, `hooks/use-hotel-escrow-resource.ts`, `hooks/use-hotel-role.ts`, `hooks/use-rental-properties.ts` | Apollo/Hasura + `apps/api` command path |
| Escrow UI | `components/escrow/{EscrowDashboard,EscrowDetailLayout,EscrowDetailView,EscrowPayFlow,NotesPanel,PaidInvoiceView,PdfExportButton,WalletReadinessChecklist}.tsx`, `components/escrow/views/{EscrowInvoiceView,EscrowPendingView,EscrowStatusView,escrow-view-utils}.tsx` | the only escrow rendering wired to real commands |
| Dashboard legacy | `components/dashboard/hotel/*`, `components/dashboard/hotels/*`, `components/dashboard/UsersMonitorTable.tsx`, `components/performance/CacheStatus.tsx`, `components/settings/BrowserNotificationsCard.tsx` | app API helpers, admin tooling, web push |
| Public legacy | `components/rent/*`, `components/guest/*`, `components/ui/{drawer,icons,image,sheet,tabs,use-toast,HasuraDownBanner}.tsx`, `components/hotels/**` already present | current live pages until their replacement lands |
| Layouts | `components/layouts/*`, `core/store/data.ts`, `middleware.ts`, `lib/middleware/*` | shell, store and role gates |

## 11. Reconciliation

- `src/app`: 62 files → 62 rows.
- `src/components`: 220 files (including two `README.md`) → 220 rows.
- `src/features`: 22 files → 22 rows.
- `src/hooks`: 17 files → 17 rows.
- `src/styles`: 1 file → 1 row.
- `public`: 86 files → 50 rows, of which 12 rows are globs (`public/img/listings/<n>/*.webp`, four photos each) and 38 are single files.

A walk of the pinned tree matched every one of the 408 files to exactly one row (0 unmatched, 0 duplicate).

Every row above has a final action. There are no `TBD` entries; anything not ported says `defer` and gives the reason, so a later issue can pick it up deliberately instead of rediscovering it.
