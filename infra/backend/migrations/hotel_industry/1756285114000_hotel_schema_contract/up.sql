-- Enforce hotel schema contract
ALTER TABLE hotels ALTER COLUMN name TYPE VARCHAR(100);
ALTER TABLE hotels ALTER COLUMN address TYPE VARCHAR(200);
ALTER TABLE hotels ALTER COLUMN description TYPE VARCHAR(500);
ALTER TABLE hotels ALTER COLUMN location_area TYPE VARCHAR(100);

-- Add owner_user_id column referencing users(id) with RESTRICT
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users(id) ON DELETE RESTRICT;

-- Index owner_user_id
CREATE INDEX IF NOT EXISTS idx_hotels_owner_user_id ON hotels(owner_user_id);

-- Enforce ON DELETE RESTRICT on rooms -> hotels (prevent cascading deletes)
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_hotel_id_fkey;
ALTER TABLE rooms ADD CONSTRAINT rooms_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE RESTRICT;

-- Ensure trigger hotels_set_updated_at maintains updated_at
CREATE OR REPLACE FUNCTION hotels_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_updated_at ON hotels;
DROP TRIGGER IF EXISTS hotels_set_updated_at ON hotels;

CREATE TRIGGER hotels_set_updated_at
BEFORE UPDATE ON hotels
FOR EACH ROW
EXECUTE FUNCTION hotels_set_updated_at();
