DROP TRIGGER IF EXISTS rooms_set_updated_at ON hotel_industry.rooms;
DROP INDEX IF EXISTS hotel_industry.idx_rooms_room_type;
DROP INDEX IF EXISTS hotel_industry.idx_rooms_hotel_id;
DROP TABLE IF EXISTS hotel_industry.rooms;
