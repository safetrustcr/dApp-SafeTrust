# Public rent catalog

`/rent` loads registered properties through `GET /api/listings`. Its property
filter selects `apartment`, `hotel`, or `both`, which controls the corresponding
Hasura root fields via GraphQL include directives. Both sources share the public
catalog response without exposing reservations, wallets, staff, or owner contacts.
Apartment owner IDs are included for the existing guest-to-host message action.

Only available, non-deleted apartments are returned. Registered hotels are shown
even before rooms are added. Hotel rates come from the least expensive available
room; unconfigured rates are shown explicitly instead of inventing a price.
Monthly apartment and nightly hotel rates are labeled separately. Location, price,
and sort filters apply to the loaded records. Pagination loads additional batches
of 50 records per selected source, without using the old numeric mock IDs.

Apartment booking opens the shared escrow create page with the database ID. Hotel
cards show their property and room details. A saved reservation is still required
before starting a hotel escrow; the public catalog does not manufacture one from
a hotel or room ID. Unsupported category/bedroom/pet metadata is not fabricated.

Hotel writes use API port 3002. Both the local frontend env and its example use
that port. API CORS allows X-Tenant-ID and Idempotency-Key alongside authorization
and content type. An API outage is reported with an actionable connection message.
The API server must run alongside the frontend; updating public environment values
requires restarting Next.js to rebuild its browser configuration.

Platform admins creating a hotel choose an existing hotel manager as the owner.
The server validates the hotel user ID and role; it never uses a Firebase UID as
an owner UUID when the hotel account is missing.
