# Frontend SafeTrust migration inventory

## Pinned baselines

| Repository | Commit | Purpose |
| --- | --- | --- |
| `safetrustcr/frontend-SafeTrust` | `f42b51938d02ae15bf1aabe178f02c8bf0456486` | Source presentation baseline (`feat(ui): update homepage description, navigation buttons, and calendar styling`) |
| `safetrustcr/dApp-SafeTrust` | `034fcc9cdc041e35a47fb82472b50c0d25c31b8b` | Target application baseline before this documentation change |

The source checkout was clean when inventoried. Migration work must target
`apps/frontend` (`@safetrust/web`) in this repository. Never copy a source
`package.json`, lockfile, environment file, middleware, API route, server module,
or demo-data implementation into the dApp.

## Manifest policy

The source contains 348 non-test UI/application files across `src/app`,
`src/components`, `src/features`, and `src/hooks`, plus public assets. The
following manifest is deliberately grouped by stable ownership boundary rather
than copied mechanically. Each listed source path family has one decision; new
files added after the pinned source commit require a new manifest row before
they are migrated.

| Source files / family | Destination | Action | Imports or rules requiring adaptation |
| --- | --- | --- | --- |
| `src/components/ui/{alert,avatar,badge,button,calendar,card,checkbox,dialog,dropdown-menu,empty-state,form,icon-button,input,label,popover,select,separator,sheet,skeleton,sonner,table,textarea,tooltip}.tsx` | Matching `apps/frontend/src/components/ui/` file | merge | Preserve existing UI exports; compare Radix versions before copying behaviour. |
| `src/components/ui/{LazyMotionProvider,ThemeToggle,motion-features,widget-boundary}.tsx` | Matching UI/provider location | adapt | Keep dApp providers and `motion` v12 API; do not add React 19-only code. |
| `src/components/layouts/{Header,SearchHeader,SideBar,PageContainer,PageHeader,nav-items,nav-item-styles}.tsx` | `apps/frontend/src/components/layouts/` | merge | Rewire to Firebase/Pollar session, role and route helpers already in the dApp. |
| `src/components/layouts/DemoBanner.tsx` | — | do not copy | Source demo-only UI must not appear in live routes. |
| `src/components/home/*`, `src/components/DestinationCarousel.tsx` | `apps/frontend/src/components/home/` | adapt | Presentation/assets may move; listing and destination values must use live data or an explicit empty state. |
| `src/components/listings/**` | `apps/frontend/src/components/listings/` | merge/adapt | Keep `features/listings` live adapters, UUID routes, filtering and API error states. |
| `src/components/rooms/**` | `apps/frontend/src/components/rooms/` | adapt | Route booking through the dApp booking/escrow orchestrator; do not use source booking API routes. |
| `src/components/hotels/**` | `apps/frontend/src/components/hotels/` | merge/adapt | Keep tenant-scoped Hasura queries and the dApp hotel access gate. |
| `src/components/messages/**` | `apps/frontend/src/components/messages/` | merge | Keep the dApp message API, subscriptions and conversation authorization. |
| `src/components/dashboard/{analytics,apartments,guest,hotels,profile,ui}/**` | Matching dashboard feature directories | merge/adapt | Preserve live Hasura/API data, verified role gates and existing empty/error states. |
| `src/components/dashboard/{EscrowTable,EscrowStatusBadge,EscrowsByStatus,RecentActivity,RoleEscrowDashboard,WalletAddressTable,QuickActions}.tsx` | `apps/frontend/src/components/dashboard/` | merge/adapt | Keep server-validated escrow state and wallet data; never restore fixtures. |
| `src/components/escrow/**` | `apps/frontend/src/components/escrow/` | merge/adapt | Keep `lib/api/escrow.ts`, idempotency keys, pending actions, wallet signing and Testnet lifecycle. |
| `src/components/tw-blocks/**` | — | defer | Source Trustless Work SDK blocks are not compatible with the dApp API/pending-action command path. Review only when there is an explicit SDK migration decision. |
| `src/components/auth/**`, `src/features/auth/**`, `src/features/account/**` | Existing auth/wallet components and `src/lib/auth/` | adapt | Retain Firebase, Pollar sync, wallet registration and SEP-10 behaviour. Do not copy source server auth handlers. |
| `src/features/apartments/{live,mappers,repository,index}.ts` | Existing listings/apartment data layer | adapt | Use real Apollo/Hasura data. `demo.ts` and `testing/fixtures.ts` are test-only and must not enter a live path. |
| `src/features/{bookings,hotels,dashboard,escrow,help,listings}/**` | Corresponding dApp feature/data layer | adapt/merge | Port presentation and pure transforms only; retain dApp API helpers, route IDs, access checks and error states. |
| `src/hooks/{useInView,useGeolocation,useTheme}.ts` | Matching `apps/frontend/src/hooks/` file | copy/adapt | Browser-only hooks must remain client-safe. |
| `src/hooks/{useApartmentListings,useCurrentUser,useConversation,useConversations,useNotifications,useWallet}.ts` | Existing dApp hooks/API layer | adapt | Rewire to Apollo/Hasura, Firebase, messages API and `use-active-wallet`; no source fixture fallback. |
| `src/styles/scroball.css` | `apps/frontend/src/styles/scroball.css` | merge | Retain current global style order and Tailwind configuration. |
| `src/app/(marketing)/**` and `src/app/(checkout)/**` | See `routes.md` | adapt | Port layout and presentation only. Keep canonical dApp routes and booking-to-escrow flow. |
| `src/app/(app)/**` | See `routes.md` | merge/adapt | Preserve dApp dashboard role gates and API-backed pages. |
| `src/app/(auth)/**` | Existing `/login`, `/register`, `/forgot-password` pages | adapt | Keep current Firebase/Pollar behavior. |
| `src/app/api/**`, `src/middleware.ts` | — | keep | The dApp's API proxying, middleware and auth boundaries win. |
| `public/img/{brands,destinations}/**`, `public/img/{logo,map,placeholder}.svg`, `.well-known/stellar.toml` | `apps/frontend/public/` after attribution review | adapt | Copy only assets that are referenced by migrated UI and have documented provenance. |
| `public/img/{listings,avatars}/**`, `public/img/{hotel,room*}.png`, `public/img/person.jpg` | — or explicit fixture-only location | defer | These are demo/listing content, not live production listings. Do not use as fallback data. |

## Dependency disposition

No dependency is approved by this inventory. A later UI PR must justify each
addition independently.

| Source dependency group | Decision |
| --- | --- |
| `motion`, Radix primitives, `react-day-picker`, `recharts`, `zustand`, `react-hook-form`, Stellar Wallets Kit | replace with the compatible version already in `apps/frontend`; do not downgrade/upgrade as a side effect. |
| React 19, React DOM 19, Next 15 source-specific APIs | drop/adapt; target currently uses React 18.2 with Next 15.5.x. |
| Jest, demo Playwright setup, `firebase-admin`, source API/server libraries | drop; target uses Vitest, provisioned Testnet Playwright and `apps/api`. |
| TanStack Query, Trustless Work SDK, Axios, WalletConnect, Leaflet, Redux, i18n, Sentry, glass UI | defer; no installation until a concrete migrated feature needs it and an owner approves it. |

## Non-negotiable migration rules

- No demo arrays or images may become a live-data fallback.
- Wallet private keys, Trustless Work credentials and server secrets never enter the browser bundle.
- Escrow writes continue through the dApp API with idempotency and pending-action verification.
- Every migrated screen must provide loading, empty and friendly error states.
- Each migration PR includes its source-to-target file list and responsive screenshots at 360, 768 and 1280 pixels in light and dark themes.
