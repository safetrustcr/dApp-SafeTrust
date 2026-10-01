ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_hotel_id_fkey;
ALTER TABLE rooms ADD CONSTRAINT rooms_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE;

DROP INDEX IF EXISTS idx_hotels_owner_user_id;
ALTER TABLE hotels DROP COLUMN IF EXISTS owner_user_id;

DROP TRIGGER IF EXISTS hotels_set_updated_at ON hotels;
CREATE TRIGGER update_updated_at
BEFORE UPDATE ON hotels
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
