CREATE TABLE IF NOT EXISTS hotel_industry.rooms (
    room_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id      UUID NOT NULL REFERENCES hotel_industry.hotels(id) ON DELETE RESTRICT,
    room_number   VARCHAR(10) NOT NULL,
    room_type_id  UUID NOT NULL REFERENCES hotel_industry.room_types(id) ON DELETE RESTRICT,
    price_night   NUMERIC(10,2) NOT NULL CHECK (price_night > 0),
    capacity      INTEGER NOT NULL CHECK (capacity > 0),
    is_available  BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT rooms_unique_number_per_hotel UNIQUE (hotel_id, room_number)
);

CREATE INDEX IF NOT EXISTS idx_rooms_hotel_id   ON hotel_industry.rooms (hotel_id);
CREATE INDEX IF NOT EXISTS idx_rooms_room_type  ON hotel_industry.rooms (room_type_id);
