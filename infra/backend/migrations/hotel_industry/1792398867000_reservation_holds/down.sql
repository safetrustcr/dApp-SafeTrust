-- Drop the overlap guard constraint
ALTER TABLE hotel_industry.reservations
DROP CONSTRAINT IF EXISTS reservations_room_date_overlap;

-- Drop the hold_expires_at index
DROP INDEX IF EXISTS hotel_industry.idx_reservations_hold_expires_at;

-- Remove the hold_expires_at column
ALTER TABLE hotel_industry.reservations
DROP COLUMN IF EXISTS hold_expires_at;
