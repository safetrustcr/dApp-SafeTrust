CREATE TABLE IF NOT EXISTS hotel_industry.hotels (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id  UUID NOT NULL REFERENCES hotel_industry.users(id) ON DELETE RESTRICT,
    name           VARCHAR(100) NOT NULL CHECK (char_length(trim(name)) > 0),
    description    VARCHAR(500),
    address        VARCHAR(200) NOT NULL CHECK (char_length(trim(address)) > 0),
    location_area  VARCHAR(100),
    coordinates    geometry(Point, 4326),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotels_owner         ON hotel_industry.hotels (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_hotels_location_area ON hotel_industry.hotels (location_area);
CREATE INDEX IF NOT EXISTS idx_hotels_coordinates   ON hotel_industry.hotels USING GIST (coordinates);

CREATE TRIGGER hotels_set_updated_at
  BEFORE UPDATE ON hotel_industry.hotels
  FOR EACH ROW EXECUTE FUNCTION hotel_industry.set_updated_at();
