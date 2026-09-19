DROP TRIGGER IF EXISTS update_updated_at ON hotels;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP INDEX IF EXISTS idx_hotels_coordinates;
DROP INDEX IF EXISTS idx_hotels_location_area;
DROP INDEX IF EXISTS idx_hotels_name;
DROP TABLE IF EXISTS hotels;
