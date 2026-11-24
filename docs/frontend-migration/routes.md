# Frontend SafeTrust route ownership map

This map assigns every source route family a concrete target decision. The
canonical target is `apps/frontend/src/app`; route groups in the source are
organizational only and do not change the public URL.

| Source route | dApp route / decision | Gate and implementation owner |
| --- | --- | --- |
| `/` | migrate to `/` | Public marketing shell; real listing summaries only. |
| `/rent` | keep as `/rent` | Public listing API/Apollo data. |
| `/rent/[id]` | redirect to `/apartment/[id]` | Canonical apartment UUID and live property query. |
| `/rent/[id]/escrow/create` | redirect to `/apartment/[id]/escrow/create` | Authenticated guest; booking escrow orchestrator. |
| `/rent/[id]/escrow/[escrowId]` | redirect to `/apartment/[id]/escrow/[escrowId]` | Authorized escrow participant; live lifecycle status. |
| `/hotels` | keep `/hotel` as canonical; redirect source path | Public hotel data and tenant-safe query. |
| `/hotels/[id]` | keep `/hotel/[id]` as canonical; redirect source path | Public hotel detail query. |
| `/hotels/[id]/book` | migrate presentation into `/dashboard/hotel/booking/[bookingId]/escrow` | Authenticated guest; validated reservation before escrow. |
| `/room` | defer | No canonical live room-search route until its hotel query contract is confirmed. |
| `/guest/suggestions` | keep `/dashboard/guest/suggestions` | Guest role gate; live recommendations only. |
| `/guest/profile` | keep `/dashboard/profile` | Authenticated user; Firebase-backed profile. |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | keep equivalent current auth routes | Firebase/Pollar implementation wins; source presentation may be adapted. |
| `/dashboard` | keep `/dashboard` | Authenticated role-aware dashboard. |
| `/dashboard/apartments`, `/dashboard/apartments/new`, `/dashboard/apartments/[id]/edit` | keep current apartment routes | Host/admin gate; real apartment CRUD. |
| `/dashboard/apartments/[id]/offers` | keep current `/dashboard/apartments/[id]/offers` | Host/admin gate; live bid/offer data. |
| `/dashboard/hotels`, `/dashboard/hotels/new`, `/dashboard/hotels/[id]`, `/dashboard/hotels/[id]/edit` | keep same paths | Hotel manager/staff/admin data access. |
| `/dashboard/escrow`, `/dashboard/escrow/[id]`, `/dashboard/escrow-dashboard` | keep same paths | Escrow participant/privileged role gate; API-backed lifecycle. |
| `/dashboard/messages`, `/dashboard/messages/[conversationId]`, `/dashboard/messages/new` | keep current message routes | Authenticated conversation participant only. |
| `/dashboard/notifications` | keep `/dashboard/notifications` | Authenticated user; existing notification/push path. |
| `/dashboard/profile`, `/dashboard/profile/security` | keep `/dashboard/profile`; defer security subroute | Authenticated user; do not add source account APIs. |
| `/dashboard/favorites` | keep `/dashboard/favorites` | Authenticated user; current wishlist contract. |
| `/dashboard/guest` | keep `/dashboard/guest` | Guest role gate. |
| `/dashboard/users` | keep `/dashboard/users` | Platform-admin-only user administration. |
| `/dashboard/manager` | keep as dApp-only | Explicit manager role gate; no source equivalent. |
| `/dashboard/hotel/**` | keep as dApp-only | Existing hotel booking/search/payment routes remain canonical. |
| `/dashboard/apartments/offers`, `/dashboard/favorites/[wishlistId]` | keep as dApp-only | Existing route behavior wins. |
| `/403`, `/help/**` | defer | No UI migration until access/help content has a confirmed product owner. |
| source `app/api/**` | keep dApp `app/api/**`; do not migrate | API routing remains delegated to `apps/api` and existing proxy routes. |

## Redirect rules

Redirects must preserve a valid UUID or engagement ID, reject unknown query
parameters, and never use a route redirect as authorization. Access checks run
again at the canonical destination.

## Route-level quality gate

Before a route is marked migrated, verify signed-out, loading, empty, error,
and authorized states. For escrow routes, also verify that browser input cannot
replace the server-resolved amount, tenant, participant wallet or action.
