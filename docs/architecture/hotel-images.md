# Hotel and room photos

The normalized relationships are:

- `hotels` 1:N `rooms`, enforced by `rooms.hotel_id`.
- `rooms` 1:N `room_images`, enforced by `room_images.room_id`.
- `hotels` 1:N `hotel_images`, enforced by `hotel_images.hotel_id`.
- A hotel and user have at most one staff membership per pair.

A room references one hotel; its hotel name, address, and other details are read
through the relationship instead of being copied to the room row. Hotel photos
show the property; room photos show a specific room. No image URL column or
repeated photo array is added to `hotels`.

Hotel creation writes the parent and photos with a nested Hasura mutation. Editing
locks/updates the parent, deletes its old photos, and inserts the replacement list
in one mutation against the same Postgres source. Any failure rolls back all these
writes. Foreign keys reject orphan photos. Unique positions limit a hotel to eight
ordered photos, and an indexed hash of each image string rejects duplicate entries
within one hotel. Deleting a hotel cascades to its photos. Existing rooms and
reservations continue to restrict hotel deletion.

Hotel managers read photos through hotel ownership; staff read them through hotel
membership. Browser write permissions are not granted. The API authorizes the
manager/admin and validates image inputs before each write. The create/edit form,
hotel list, hotel details, and related room photo gallery use these relationships.
Hotel queries request a hotel role already granted in the user's signed token.

The initial attachment implementation stores compressed raster image data URLs in
`hotel_images.image_url` (TEXT); external HTTP(S) URLs are also accepted. Attachments
are limited to JPEG/PNG/WebP, 10 MB source files, 1200-pixel longest side, 700,000
characters per prepared image, and eight photos. API JSON limits are raised only
for hotel endpoints. This is portable database storage, not a cloud object upload.
An object storage service can replace the image string with a durable object URL
later without changing the parent/child relationships. `room_images.image_url`
remains a separate field for hosted room image URLs.

Apply migration `1792010000000_create_hotel_images` and redeploy both tenants'
metadata. The generated hotel init snapshot is kept in sync. The live regression
check `infra/backend/tests/hotel-images.py` verifies creation, atomic replacement,
rollback on duplicate insertion, access isolation, foreign keys, and cascading
deletion using temporary fixtures. It also runs in the infrastructure CI job.

Hotel validation is executable shared code in `@safetrust/types`. The package
publishes compiled ESM JavaScript from `dist/index.js` and TypeScript types from
`src/index.ts`. API development, builds, and tests build that dependency first;
root development also builds workspace dependencies before launching the servers.
A plain-Node regression test verifies the validator's real runtime export, since
Vitest's module transformation previously masked a CommonJS namespace mismatch.
