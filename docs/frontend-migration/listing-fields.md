# Listing field matrix

One row per field the new listing UI shows (`ListingView` in
`apps/frontend/src/features/listings/model.ts`). Sources were verified against
this repo's schema — `infra/backend/migrations/{safetrust,hotel_industry}` and
the Hasura metadata under `infra/backend/metadata/tenants` — not against the
frontend-SafeTrust prose.

Rules that apply to every row:

- A field the API doesn't have is **undefined** (or `[]` for `images`) — never
  `''`, `0`, a default coordinate, or a demo value. The UI hides the field.
- `id`, `title`, `addressLine` and `price` are required: if a source row lacks
  one, the adapter throws a contract error instead of inventing a value.
- Price amounts are never converted: no monthly ÷ 30, no per-night relabel.

| UI field | Apartment source | Hotel source | If missing |
| --- | --- | --- | --- |
| `id` | `apartments.id` (uuid) via `GET_APARTMENTS` / `GET_ALL_APARTMENTS` / `GET_APARTMENT_BY_ID` | `rooms.room_id` (uuid) via `GET_HOTEL_LISTINGS` / `GET_HOTEL_LISTING_BY_ID` — the hotel feed roots at `rooms`, see "Why the hotel feed roots at `rooms`" | required, adapter throws |
| `title` | `apartments.name` | `hotels.name` through the `rooms.hotel` relationship | required, adapter throws |
| `images[]` | `apartments.image_urls` (`text[]`) | **no source.** The dApp schema has no `hotel_images` table. (`room_images` exists, but its `rooms.images` relationship is declared as an object relationship on a non-unique FK and is deliberately not queried — see note below.) | `[]` → gallery hidden |
| `addressLine` | `apartments.address` JSONB → `[street, neighborhood, city]` joined, `country` as fallback | `hotels.address` (`varchar NOT NULL`) | required, adapter throws |
| `price.amount` | `apartments.price` (`numeric`) — raw value, never divided | `rooms.price_night` (`numeric`) — cheapest/own room price, raw value | required, adapter throws (never `0`) |
| `price.unit` | `'month'` — data contract: `NewApartmentForm` labels the field "Monthly Price (USD)", every existing card renders `/mo`, escrow books monthly rent. There is no unit column; the table's contract is monthly. | `'night'` — data contract: the column is literally named `price_night` | required (`'month'` / `'night'` from the contract above) |
| `price.currency` | `USD` — contract constant: there is no per-row currency column, the create form labels amounts USD, dashboard panels format USD, `pricing_rules` uses `'USD'`. Never converted. | same | `USD` |
| `deposit` | `apartments.warranty_deposit` (`numeric`, `NOT NULL CHECK > 0`) | **no source** — hotels/rooms have no deposit column | `undefined` → hidden |
| `coordinates` | `apartments.coordinates` (`point`, implicit scalar → string `"(lat,lng)"`; the dApp writes `` `(${lat},${lng})` `` in `NewApartmentForm`, so first = lat, second = lng) | `hotels.coordinates` (`geometry(Point,4326)` → GeoJSON `{"type":"Point","coordinates":[lng,lat]}`) | `undefined` → map hidden; no default coordinates |
| `province` | `address.province` / `address.state` JSONB keys **if** a writer included them. The current form writes `street/neighborhood/city/country` only, so this is normally `undefined`. | **no source** — `hotels.address` is free text and `location_area` is a zone ("Sabana"), not a province. No guessing from comma-splitting. | `undefined` → hidden |
| `hostName` | `apartments.owner` (object relationship on `owner_id` → `users`) → `first_name` / `last_name` joined | **no source** — `hotels` has no owner FK at this commit (`create_hotel_users` notes a later `ALTER` that was never added) | `undefined` → UI shows the literal "Host" |
| amenities | not in `ListingView` (no amenities column exists) | not in `ListingView` | hidden, filter disabled |
| capacity | not in `ListingView` (`rooms.capacity` exists but the model has no field — schema/model change is a separate issue) | same | hidden, filter disabled |
| availability | not in `ListingView` (`apartments.is_available` / `available_from` / `available_until` exist, but the UI's availability concept needs more than the model carries — separate issue) | same (`rooms.status`) | hidden, filter disabled |

## Why the hotel feed roots at `rooms`

`infra/backend/metadata/tenants/hotel_industry/databases/tables/public_hotels.yaml`
declares `hotels → rooms` as an **object** relationship using
`foreign_key_constraint_on: { table: rooms, columns: [hotel_id] }` — a one-to-many
FK declared as many-to-one. The inverse direction (`rooms.hotel`, used by the
existing `GET_HOTEL_ROOMS`) is a normal object relationship on the FK's own
column and is safe to query. Until the metadata is corrected and verified
against a live Hasura, `GET_HOTEL_LISTINGS` roots at `rooms` and joins `hotel`,
which also gives every card a guaranteed price source (`price_night NOT NULL`)
and a unique listing id (`rooms.id`, which the matrix explicitly allows).

Consequence: one listing card per room, titled by its hotel. A hotel without
rooms cannot appear (it would have no price), which is honest rather than
inventing one.

## Queries feeding the hooks

| Hook | Kind | Query | Fields |
| --- | --- | --- | --- |
| `useListings({ kind: 'apartment' })` | apartment | `GET_ALL_APARTMENTS` | matrix fields + pre-existing fields (`description`, `is_available`, `available_from`, `available_until`, `created_at`) that dashboard consumers (`MyApartmentsTable`, `GuestDashboard`, offers/escrow pages) already read |
| `useListings({ kind: 'apartment', ownerId })` | apartment | `GET_APARTMENTS` | same — this is today's server-side owner filter; pagination (`limit`/`offset`) and the `is_available` / `owner_id` filters are unchanged |
| `useListings({ kind: 'hotel' })` | hotel | `GET_HOTEL_LISTINGS` (new) | matrix fields only |
| `useListing('apartment', id)` | apartment | `GET_APARTMENT_BY_ID` | adds `warranty_deposit` (already read by the escrow create page but never selected — latent bug fixed), `coordinates`, `owner { first_name last_name }` |
| `useListing('hotel', id)` | hotel | `GET_HOTEL_LISTING_BY_ID` (new) | matrix fields only |

"Select only the fields the matrix uses" is applied to the new listing queries.
The apartment queries are shared with live dashboard screens, so their existing
extra fields are kept (removing them would blank out real dashboard data);
matrix fields are added on top.

Client-side filters may only run on fields the adapter fills: `price`,
`addressLine`/`province`. Bedroom/amenity/capacity/availability filters stay
disabled until their schema issue lands.

## State model (never fixtures)

`useListings` → `loading | ready | empty | error` with
`error?: 'unauthorized' | 'network'`.
`useListing` → `loading | ready | not_found | error` with the same error codes.

- `unauthorized`: GraphQL `extensions.code` in
  `invalid-jwt / jwt-expired / permission-denied / not-in-session /
  UNAUTHENTICATED / FORBIDDEN`, an auth-flavored message, or HTTP 401/403.
- `network`: every other failure (transport, 5xx, server errors).
- Unknown id (including a syntactically invalid uuid, which can never exist in
  a uuid PK column) → `not_found` without issuing a doomed query.
- A failed request returns `items: []` / `item: undefined` — **never** fixtures.

## Permissions reality (pending dependency)

- `public.apartments` select permissions exist for `tenant` (only
  `is_available = true` rows) and `landlord` (own rows). There is **no
  anonymous role yet** — the inventory/admin-secret issue must land before the
  public pages work for signed-out visitors. `config/apollo.ts` still sends the
  admin secret (pre-existing TODO).
- `public.users` select permission is `id = X-Hasura-User-Id`, so
  `owner { first_name last_name }` resolves only when the owner row is visible
  to the session (admin today, or the owner themselves). Otherwise `hostName`
  is `undefined` and the UI shows "Host" — the honest fallback.

## Deviations from the issue's file list at this commit

The workspace is pinned before several referenced files exist; recorded here so
reviewers can match the issue against reality:

- `apps/frontend/src/hooks/use-rental-properties.ts` — does not exist; nothing
  to reuse or replace. `useListings` is self-contained.
- `lib/api/hotels.ts` — does not exist; hotel data comes from
  `graphql/queries/hotel-queries.ts`.
- `useApartmentListings()` / `APARTMENT_LISTINGS` — not present in this repo
  yet (they arrive with the ported listing UI); the grep acceptance criterion
  still holds for every file in this issue.
- `@safetrust/graphql` (`packages/graphql/generated/index.ts`) is an empty
  file: codegen needs a live Hasura (`CODEGEN_SCHEMA_URL`) and the committed
  stub schema referenced by `codegen.ts` is absent. The row types therefore
  live in `model.ts` as the documented selection contract of the queries above
  — swap them for the generated types once codegen output exists, rather than
  letting them drift.
- `scripts/check-client-secrets.sh` — not present at this commit.
- Demo mode (`NEXT_PUBLIC_LISTINGS_DEMO`) was **not** implemented: it is
  optional, and the live pages render honest loading/empty/error states
  without it.
