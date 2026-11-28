CREATE TABLE IF NOT EXISTS hotel_industry.room_types (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name         VARCHAR(50) NOT NULL UNIQUE,
    description  TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_types_name ON hotel_industry.room_types (name);

CREATE TRIGGER room_types_set_updated_at
  BEFORE UPDATE ON hotel_industry.room_types
  FOR EACH ROW EXECUTE FUNCTION hotel_industry.set_updated_at();
