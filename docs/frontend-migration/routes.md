# Route ownership map

Issue: [#519](https://github.com/safetrustcr/dApp-SafeTrust/issues/519) · Source: `safetrustcr/frontend-SafeTrust@c46c11593312bf0a8b9de445107293eb9a9dbea3` · Target base: `dApp-SafeTrust@3e120c5063f8fe866d6425a471c12f49541d38ee`

Every route in `apps/frontend/src/app` and every route in the source app has exactly one decision below. No route is "TBD".

## Decision vocabulary

| Decision | Meaning |
| --- | --- |
| `migrate` | The route keeps its URL and receives the new UI, wired to the dApp's real data/session/escrow path. |
| `keep as is` | The route stays exactly as it is today. Either the dApp version already wins, or the source has no counterpart worth porting. |
| `redirect` | The route forwards to a canonical dApp route. The old URL keeps working. |
| `defer` | The route (or the source route) is intentionally not part of this migration. A later issue must decide to build or retire it. |

## Gate vocabulary

The dApp has three independent layers; every route row names the effective one.

| Gate | Enforced by | Behaviour |
| --- | --- | --- |
| `public` | — | No session required (matched outside `middleware.ts` `config.matcher`). |
| `session` | `src/middleware.ts` | `firebase-token` cookie required for `/dashboard/**`; missing/invalid → `/login?redirect=…&reason=unauthenticated`. |
| `session+role` | `src/middleware.ts` + `src/lib/middleware/roles.ts` | Role is read from the `user-role` cookie (1 h TTL) or resolved from Hasura and cached. |
| `role:host` | `HOST_ONLY_ROUTES` = `/dashboard/apartments`, `/dashboard/escrow-dashboard`, `/dashboard/manager` | A guest is redirected to `/dashboard/guest?blocked=true`. |
| `role:admin` | `ADMIN_ONLY_ROUTES` = `/dashboard/users` | Non-admin goes to their role home (guest → `/dashboard/guest?blocked=true`). |
| `role:guest` | `GUEST_ONLY_ROUTES` = `/dashboard/guest` | A host is redirected to `/dashboard/escrow-dashboard`. |
| `layout-session` | `src/app/dashboard/layout.tsx` | Client-side second check (store token/address or `localStorage` wallet) for `PUBLIC_ROUTES` exceptions in the dashboard shell. |
| `service` | route handler | Server-to-server or health route, no UI. |
| `escrow-party` | `apps/api` + Hasura permissions (plus the connected wallet in the page) | Escrow pages render only for the escrow's parties and require a connected wallet; the API rejects anyone else. `/escrow/**` is **not** in the middleware matcher, so this is the only gate on those pages. |

Notes that apply to the whole table:

- `/dashboard/hotel/**` is listed in `dashboard/layout.tsx` `PUBLIC_ROUTES`, so the **client** shell does not bounce it — but `middleware.ts` still requires the session cookie. Gate recorded as `session`.
- `/login` and `/register` are public, but an authenticated visitor is redirected to `/dashboard`.
- Hasura row-level permissions remain the real authorization boundary; the gates above only decide what renders.

## 1. `apps/frontend/src/app` — every route (45)

| dApp route | File | Gate | Decision | Notes |
| --- | --- | --- | --- | --- |
| `/apartment` | `src/app/apartment/page.tsx` | public | migrate | listing index; receives the `listings/*` grid + `FilterSidebar` + `BedroomTabs` presentation (file still has a stub-data TODO today) |
| `/apartment/[id]` | `src/app/apartment/[id]/page.tsx` | public | migrate | canonical rent detail; receives `src/app/rent/[id]` + `listings/ApartmentDetail` UI (file still has a stub-data TODO today) |
| `/apartment/[id]/escrow/create` | `src/app/apartment/[id]/escrow/create/page.tsx` | escrow-party | keep as is | legacy alias: `redirect()` to `/escrow/[id]/escrow/create`; no UI lives here |
| `/apartment/[id]/escrow/[escrowId]` | `src/app/apartment/[id]/escrow/[escrowId]/page.tsx` | escrow-party | keep as is | legacy alias: `redirect()` to `/escrow/[id]/escrow/[escrowId]`; no UI lives here |
| `/api/auth/role-cookie` | `src/app/api/auth/role-cookie/route.ts` | service | keep as is | writes the `user-role` cookie the middleware trusts |
| `/api/health/hasura` | `src/app/api/health/hasura/route.ts` | service | keep as is | health probe |
| `/dashboard` | `src/app/dashboard/page.tsx` | session+role | keep as is | middleware redirects to `dashboardHomeForRole` |
| `/dashboard/apartments` | `src/app/dashboard/apartments/page.tsx` | session + role:host | migrate | `MyApartmentsTable` presentation only; Apollo data stays |
| `/dashboard/apartments/[id]/offers` | `src/app/dashboard/apartments/[id]/offers/page.tsx` | session + role:host | keep as is | dApp page wins; source offers page depends on the demo offers hook |
| `/dashboard/apartments/new` | `src/app/dashboard/apartments/new/page.tsx` | session + role:host | migrate | new form presentation into `NewApartmentForm` (Apollo `CREATE_APARTMENT`) |
| `/dashboard/escrow` | `src/app/dashboard/escrow/page.tsx` | session | migrate | escrow table presentation; rows from the dApp query |
| `/dashboard/escrow-dashboard` | `src/app/dashboard/escrow-dashboard/page.tsx` | session + role:host | migrate | `RoleEscrowDashboard` presentation, real escrow data |
| `/dashboard/escrow/[id]` | `src/app/dashboard/escrow/[id]/page.tsx` | session + escrow-party | migrate | escrow detail presentation over Apollo `GET_ESCROW_BY_ANY_ID` + `use-escrow-stream`; commands via `@/lib/api/escrow.ts` |
| `/dashboard/escrow/create/[kind]/[id]` | `src/app/dashboard/escrow/create/[kind]/[id]/page.tsx` | session | keep as is | legacy redirect into `/escrow/[id]/escrow/create` |
| `/dashboard/favorites` | `src/app/dashboard/favorites/page.tsx` | session | keep as is | empty state; there is no favorites API and no demo favorites are ported |
| `/dashboard/guest` | `src/app/dashboard/guest/page.tsx` | session + role:guest | migrate | `GuestDashboard` presentation over `useRentalProperties` |
| `/dashboard/guest/suggestions` | `src/app/dashboard/guest/suggestions/page.tsx` | session + role:guest | migrate | target of `/guest/suggestions`; keeps the guest gate |
| `/dashboard/hotel` | `src/app/dashboard/hotel/page.tsx` | session | keep as is | legacy hotel workspace, unchanged in the UI migration |
| `/dashboard/hotel/booking/[bookingId]/escrow` | `src/app/dashboard/hotel/booking/[bookingId]/escrow/page.tsx` | session + escrow-party | keep as is | target of `/bookings/[bookingId]/escrow` |
| `/dashboard/hotel/create-escrow` | `src/app/dashboard/hotel/create-escrow/page.tsx` | session | keep as is | legacy hotel workspace |
| `/dashboard/hotel/details` | `src/app/dashboard/hotel/details/page.tsx` | session | keep as is | legacy hotel workspace |
| `/dashboard/hotel/payment` | `src/app/dashboard/hotel/payment/page.tsx` | session | keep as is | legacy hotel workspace |
| `/dashboard/hotel/search` | `src/app/dashboard/hotel/search/page.tsx` | session | keep as is | legacy hotel workspace |
| `/dashboard/hotels` | `src/app/dashboard/hotels/page.tsx` | session | migrate | `MyHotelsTable` presentation; `@/lib/api/hotels` data |
| `/dashboard/hotels/[id]` | `src/app/dashboard/hotels/[id]/page.tsx` | session | migrate | `HotelDetailsView` presentation; detail data through `apiRequest` in `@/lib/api/hotels` |
| `/dashboard/hotels/[id]/edit` | `src/app/dashboard/hotels/[id]/edit/page.tsx` | session | migrate | `HotelForm` presentation; `updateHotel` stays |
| `/dashboard/hotels/new` | `src/app/dashboard/hotels/new/page.tsx` | session | migrate | `HotelForm` presentation; `createHotel` stays |
| `/dashboard/manager` | `src/app/dashboard/manager/page.tsx` | session + role:host | keep as is | wallet playground; not part of the UI migration |
| `/dashboard/messages` | `src/app/dashboard/messages/page.tsx` | session | migrate | conversation list presentation over `@/lib/api/messages` |
| `/dashboard/messages/[conversationId]` | `src/app/dashboard/messages/[conversationId]/page.tsx` | session | migrate | thread presentation + subscription stay |
| `/dashboard/notifications` | `src/app/dashboard/notifications/page.tsx` | session | migrate | notification list presentation; keep `BrowserNotificationsCard` |
| `/dashboard/profile` | `src/app/dashboard/profile/page.tsx` | session | migrate | profile form presentation |
| `/dashboard/users` | `src/app/dashboard/users/page.tsx` | session + role:admin | keep as is | admin user provisioning out of scope |
| `/escrow/[id]/escrow/create` | `src/app/escrow/[id]/escrow/create/page.tsx` | escrow-party | migrate | **canonical escrow create** (`BookingEscrowOrchestrator`); receives the `src/app/rent/[id]/escrow/create` UI; commands stay in `@/lib/api/escrow.ts` |
| `/escrow/[id]/escrow/[escrowId]` | `src/app/escrow/[id]/escrow/[escrowId]/page.tsx` | escrow-party | migrate | **canonical escrow detail** (`EscrowDetailView`); receives `src/app/rent/[id]/escrow/[escrowId]` UI + `escrow/views/*` |
| `/forgot-password` | `src/app/forgot-password/page.tsx` | public | migrate | new form UI, Firebase reset behaviour |
| `/guest` | `src/app/guest/page.tsx` | public | keep as is | renders `GuestDashboard`; the source `/guest/suggestions` maps to the dashboard route instead |
| `/hotel` | `src/app/hotel/page.tsx` | public | keep as is | legacy alias: server `redirect()` to `/rent`, which already lists apartments and hotels with a kind toggle |
| `/hotel/[id]` | `src/app/hotel/[id]/page.tsx` | public | keep as is | legacy alias: server `redirect()` to `/apartment/[id]` (hotel ids canonicalised first) |
| `/hotel/[id]/escrow/create` | `src/app/hotel/[id]/escrow/create/page.tsx` | escrow-party | keep as is | legacy alias: `redirect()` to `/escrow/[id]/escrow/create` (hotel ids are canonicalised first); no UI lives here |
| `/hotel/[id]/escrow/[escrowId]` | `src/app/hotel/[id]/escrow/[escrowId]/page.tsx` | escrow-party | keep as is | legacy alias: `redirect()` to `/escrow/[id]/escrow/[escrowId]`; no UI lives here |
| `/login` | `src/app/login/page.tsx` | public (authenticated → `/dashboard`) | migrate | new form UI, dApp Firebase/Pollar behaviour |
| `/notifications` | `src/app/notifications/page.tsx` | public | keep as is | server redirect to `/dashboard/notifications` |
| `/register` | `src/app/register/page.tsx` | public (authenticated → `/dashboard`) | migrate | new form UI, `use-register-form` behaviour |
| `/rent` | `src/app/rent/page.tsx` | public | migrate | new rent/suggestions UI over `useRentalProperties` |

## 2. `safetrustcr/frontend-SafeTrust/src/app` — every route (44)

Source gates come from the source `middleware.ts` (`/dashboard`, `/guest`, `/bookings` prefixes, `/hotels/[id]/book*` and `/rent/[id]/escrow*` patterns, host-area rewrite to `/403`, public allow-list) plus the source dashboard layout.

| Source route | Source gate | Decision | dApp target | Notes |
| --- | --- | --- | --- | --- |
| `/` | public | migrate | `/` | new landing page replaces the dApp landing page in place |
| `/403` | public | defer | — | dApp blocks blocked guests with `/dashboard/guest?blocked=true`; add a page only if a real 403 surface is needed |
| `/api/auth/reset-password` | service | defer | `/api/auth/role-cookie` + Firebase | password reset stays client-side Firebase |
| `/api/auth/sync-user` | service | defer | `apps/api` | user provisioning is server-owned |
| `/api/auth/validate-reset-token` | service | defer | — | hosted reset link; no token validation route in the dApp |
| `/api/auth/wallet/challenge` | service | defer | `apps/api` | SEP-10 belongs to the API |
| `/api/auth/wallet` | service | defer | `apps/api` | SEP-10 handshake |
| `/api/auth/wallet/verify` | service | defer | `apps/api` | SEP-10 verification |
| `/bookings/[bookingId]/escrow` | session | redirect | `/dashboard/hotel/booking/[bookingId]/escrow` | existing dApp route keeps the booking working |
| `/bookings/new/escrow` | session | redirect | `/rent` | no property id → no canonical escrow target; checkout starts from the listing |
| `/dashboard` | session | keep as is | `/dashboard` | role-home redirect already handled by the middleware |
| `/dashboard/apartments` | session + host only | migrate | `/dashboard/apartments` | |
| `/dashboard/apartments/[id]/edit` | session + host only | defer | — | no edit route in the dApp yet; needs an edit mutation issue |
| `/dashboard/apartments/[id]/offers` | session + host only | keep as is | `/dashboard/apartments/[id]/offers` | |
| `/dashboard/apartments/new` | session + host only | migrate | `/dashboard/apartments/new` | |
| `/dashboard/escrow` | session | migrate | `/dashboard/escrow` | |
| `/dashboard/escrow-dashboard` | session | migrate | `/dashboard/escrow-dashboard` | |
| `/dashboard/escrow/[id]` | session | migrate | `/dashboard/escrow/[id]` | |
| `/dashboard/favorites` | session | keep as is | `/dashboard/favorites` | no favorites API; dApp empty state wins |
| `/dashboard/guest` | session | migrate | `/dashboard/guest` | keeps the guest gate |
| `/dashboard/hotels` | session + host only | migrate | `/dashboard/hotels` | source applies a host check, dApp applies session only — **host check is not added by this migration** (documented as a security follow-up) |
| `/dashboard/hotels/[id]` | session + host only | migrate | `/dashboard/hotels/[id]` | same note |
| `/dashboard/hotels/[id]/edit` | session + host only | migrate | `/dashboard/hotels/[id]/edit` | same note |
| `/dashboard/hotels/new` | session + host only | migrate | `/dashboard/hotels/new` | same note |
| `/dashboard/messages` | session | migrate | `/dashboard/messages` | |
| `/dashboard/messages/[conversationId]` | session | migrate | `/dashboard/messages/[conversationId]` | |
| `/dashboard/notifications` | session | migrate | `/dashboard/notifications` | |
| `/dashboard/profile` | session | migrate | `/dashboard/profile` | |
| `/dashboard/users` | session | keep as is | `/dashboard/users` | dApp is admin-only; stricter than the source |
| `/forgot-password` | public | migrate | `/forgot-password` | |
| `/guest/suggestions` | public | redirect | `/dashboard/guest/suggestions` | the source page is public, the target keeps the guest gate: anonymous visitors hit the middleware and are sent to `/login?redirect=/dashboard/guest/suggestions` automatically |
| `/hotels` | public | redirect | `/rent` | `/rent` is the live listing page (`useRentalProperties`, kind toggle); `/hotel` is itself a redirect stub |
| `/hotels/[id]` | public | redirect | `/apartment/[id]` | canonical detail route (real UUID); `/hotel/[id]` is a redirect stub |
| `/hotels/[id]/book` | session | redirect | `/apartment/[id]` | booking checkout is deferred; the detail page owns the CTA |
| `/hotels/search` | public | redirect | `/rent` | filters/search state is client-side on `/rent` |
| `/login` | public | migrate | `/login` | |
| `/register` | public | migrate | `/register` | |
| `/rent` | public | migrate | `/rent` | |
| `/rent/[id]` | public | redirect | `/apartment/[id]` | canonical detail route with a real UUID |
| `/rent/[id]/escrow/create` | session | redirect | `/escrow/[id]/escrow/create` | canonical dApp route (the `/apartment/…` alias also redirects there) |
| `/rent/[id]/escrow/[escrowId]` | session | redirect | `/escrow/[id]/escrow/[escrowId]` | canonical dApp route |
| `/reset-password` | public | defer | — | Firebase hosted reset action link |
| `/room` | public | defer | `/apartment/[id]` | demo aggregator page over mock data |
| `/verify-email` | public | defer | — | Firebase client flow, no dedicated route |

## 3. Booking and escrow mapping, one by one

| Source page | Source behaviour | dApp route | dApp behaviour | Decision |
| --- | --- | --- | --- | --- |
| `/rent/[id]/escrow/create` | creates escrow from a rent listing | `/escrow/[id]/escrow/create` | `BookingEscrowOrchestrator`; commands via `@/lib/api/escrow.ts`, attempt-scoped Idempotency-Key | redirect + migrate UI |
| `/rent/[id]/escrow/[escrowId]` | escrow status for a rent listing | `/escrow/[id]/escrow/[escrowId]` | `EscrowDetailView`; streamed status, actions via API | redirect + migrate UI |
| `/hotels/[id]/book` | hotel checkout form | `/apartment/[id]` (later `/escrow/[id]/escrow/create?kind=hotel-room`) | the detail page owns the CTA; checkout UI lands in the canonical orchestrator in P6 | redirect, UI deferred to P6 |
| `/bookings/new/escrow` | generic new booking | `/rent` | no property context | redirect |
| `/bookings/[bookingId]/escrow` | booking-scoped escrow | `/dashboard/hotel/booking/[bookingId]/escrow` | existing hotel booking escrow page | redirect |
| `/dashboard/escrow` | escrow list | `/dashboard/escrow` | dApp list + API | migrate UI |
| `/dashboard/escrow/[id]` | escrow detail | `/dashboard/escrow/[id]` | dApp detail + API | migrate UI |
| `/dashboard/escrow-dashboard` | role dashboard | `/dashboard/escrow-dashboard` | role-gated dashboard | migrate UI |

Nothing in this table changes the command path: every escrow action still goes through `apps/api` with an `Idempotency-Key` per attempt and the dApp's 409/conflict handling in `use-escrow-action.ts`. Source pages that posted directly to Trustless Work are deferred with the rest of `tw-blocks` and `features/escrow`.

## 4. Redirects to implement

Add these in `apps/frontend/next.config.mjs` `redirects()` (static source, no cookie needed) unless the row says otherwise. All are `permanent: false` for the first release, so they can be revised without poisoning caches.

| From | To | Implementation |
| --- | --- | --- |
| `/hotels` | `/rent` | `next.config.mjs` |
| `/hotels/search` | `/rent` | `next.config.mjs` |
| `/hotels/:id` | `/apartment/:id` | `next.config.mjs` |
| `/hotels/:id/book` | `/apartment/:id` | `next.config.mjs` |
| `/rent/:id` | `/apartment/:id` | `next.config.mjs` |
| `/rent/:id/escrow/create` | `/escrow/:id/escrow/create` | `next.config.mjs` |
| `/rent/:id/escrow/:escrowId` | `/escrow/:id/escrow/:escrowId` | `next.config.mjs` |
| `/bookings/new/escrow` | `/rent` | `next.config.mjs` |
| `/bookings/:bookingId/escrow` | `/dashboard/hotel/booking/:bookingId/escrow` | `next.config.mjs` |
| `/guest/suggestions` | `/dashboard/guest/suggestions` | page-level `redirect()` (needs the session cookie to decide `/login` vs target) |

## 5. Routes that are deliberately not added

| Route | Why not |
| --- | --- |
| `/403` | the dApp expresses "blocked" with `/dashboard/guest?blocked=true`; a second error surface would duplicate it |
| `/api/auth/wallet/*`, `/api/auth/wallet/challenge`, `/api/auth/wallet/verify` | SEP-10 is `apps/api` territory; `apps/frontend` exposes only `/api/auth/role-cookie` and `/api/health/hasura` |
| `/api/auth/reset-password`, `/api/auth/validate-reset-token`, `/api/auth/sync-user` | Firebase-hosted reset + `apps/api` provisioning |
| `/reset-password`, `/verify-email` | Firebase-hosted action links / client flow |
| `/room` | demo aggregator over mock data |
| `/dashboard/apartments/[id]/edit` | accepted as a deferred capability, not a route rename |

## 6. Open security follow-ups (out of scope here)

1. `middleware.ts` decodes the Firebase JWT without verifying its signature (the file has the matching TODO). The source app verifies via JWKS. Tracked separately; the UI migration must not depend on forged-token behaviour.
2. `/dashboard/hotels/**` is session-only in the dApp, while the source treats it as host-only. Adding the host gate changes behaviour, so it needs its own reviewed change.
3. `/dashboard/hotel/**` legacy routes are session-only and remain a deprecation candidate after the `/apartment/[id]` detail migration lands.
