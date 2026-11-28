# Hotel reservation escrow

Hotel payments use the consolidated booking orchestrator and escrow lifecycle.
The booking ID is `hotel_industry.reservations.id`, not a hotel ID, room ID, or
its optional `reservation_id` reference. Create and save the reservation before
opening `/escrow/<reservation-id>/escrow/create?kind=hotel-room`.

The authenticated API reads the saved reservation, guest wallet, hotel owner,
primary Stellar receiver wallet, total amount, and stay dates. The reservation's
wallet must belong to the caller through `hotel_industry.users_wallets` and its
user's `firebase_uid`. Only PENDING and CONFIRMED reservations with positive
amounts and valid dates are payable. Self-bookings and wallet mismatches fail
before calling Trustless Work. Wallets and hotel users must already be registered;
this change does not create reservations or provision hotel wallet records.

## API

- `GET /api/escrow/hotel-reservations/:id` returns the authorized booking review.
- `POST /api/escrow/deploy` accepts exactly one `reservationId` or `apartmentId`,
  plus the selected `senderAddress` and the existing Idempotency-Key header.
  Client amounts and receiver addresses are ignored.
- `GET /api/escrow/hotel-reservations/:id/escrows/:engagementId` checks participation
  and returns an adapter for the shared lifecycle view, including wallet roles.

Each reservation uses the stable engagement `hotel:<reservation-id>`.
The shared `public.escrows` record has a reservation `property_id`, no apartment
foreign key, and `tenant_id = hotel_industry`. After deployment submission,
`trustless_work_escrows` stores booking/room/hotel IDs and dates; the existing
funding, milestone, approval, release, and dispute APIs operate on that record.
Hotel actions authorize wallets through the hotel registry. Platform dispute
resolution keeps the existing admin route guard and platform wallet registry.
Apartment conversations are not created for hotel reservations.

The hotel `escrow_transactions` table is a dashboard projection of shared
submitted actions. The shared escrow tables remain authoritative for payments.
The detail view refreshes from the authenticated API every ten seconds and after
action submission, and also responds to the existing status stream.

The full saved `total_amount` is currently the USDC escrow payment. It is not a
separate security deposit or an amount computed in the browser. If hotels need
partial deposits, store an explicit server-approved deposit policy first.

No database migration is required: this uses existing nullable apartment links,
booking metadata, reservation relationships, and hotel transaction columns.
Testnet deployment still requires configured Trustless Work/Stellar credentials,
a funded signer, and the saved guest and owner wallet registrations.
