DROP TRIGGER IF EXISTS hotels_set_updated_at ON hotel_industry.hotels;
DROP INDEX IF EXISTS hotel_industry.idx_hotels_coordinates_geog;
DROP INDEX IF EXISTS hotel_industry.idx_hotels_coordinates;
DROP INDEX IF EXISTS hotel_industry.idx_hotels_location_area;
DROP INDEX IF EXISTS hotel_industry.idx_hotels_owner;
DROP TABLE IF EXISTS hotel_industry.hotels;
