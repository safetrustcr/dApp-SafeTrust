DROP TRIGGER IF EXISTS reservations_set_updated_at ON hotel_industry.reservations;
DROP INDEX IF EXISTS hotel_industry.idx_reservations_dates;
DROP INDEX IF EXISTS hotel_industry.idx_reservations_status;
DROP INDEX IF EXISTS hotel_industry.idx_reservations_room_id;
DROP INDEX IF EXISTS hotel_industry.idx_reservations_wallet_address;
DROP TABLE IF EXISTS hotel_industry.reservations;
