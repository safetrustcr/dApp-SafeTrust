-- Add hold_expires_at column to reservations
ALTER TABLE hotel_industry.reservations
ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMPTZ;

-- Create index for hold expiration queries
CREATE INDEX IF NOT EXISTS idx_reservations_hold_expires_at
ON hotel_industry.reservations(hold_expires_at)
WHERE hold_expires_at IS NOT NULL;

-- Add overlap guard using exclusion constraint for confirmed and pending reservations with unexpired holds
-- This prevents double bookings by ensuring room date ranges don't overlap for active reservations
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE hotel_industry.reservations
ADD CONSTRAINT reservations_room_date_overlap
EXCLUDE USING GIST (
  room_id WITH =,
  tstzrange(check_in, check_out) WITH &&
)
WHERE (
  reservation_status IN ('CONFIRMED', 'PENDING')
  AND check_in IS NOT NULL
  AND check_out IS NOT NULL
);
