CREATE TABLE IF NOT EXISTS hotel_industry.reservations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id      UUID,
    wallet_address      VARCHAR(255),
    room_id             UUID REFERENCES hotel_industry.rooms(room_id) ON DELETE RESTRICT,
    check_in            TIMESTAMPTZ,
    check_out           TIMESTAMPTZ,
    capacity            INTEGER,
    reservation_status  VARCHAR(15) NOT NULL DEFAULT 'PENDING',
    total_amount        NUMERIC(10, 2),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservations_wallet_address ON hotel_industry.reservations (wallet_address);
CREATE INDEX IF NOT EXISTS idx_reservations_room_id        ON hotel_industry.reservations (room_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status          ON hotel_industry.reservations (reservation_status);
CREATE INDEX IF NOT EXISTS idx_reservations_dates           ON hotel_industry.reservations (check_in, check_out);

CREATE TRIGGER reservations_set_updated_at
  BEFORE UPDATE ON hotel_industry.reservations
  FOR EACH ROW EXECUTE FUNCTION hotel_industry.set_updated_at();
