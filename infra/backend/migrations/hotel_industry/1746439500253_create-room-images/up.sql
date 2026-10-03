CREATE TABLE IF NOT EXISTS hotel_industry.room_images (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id      UUID NOT NULL REFERENCES hotel_industry.rooms(room_id) ON DELETE CASCADE,
    image_url    VARCHAR(150) NOT NULL,
    uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_images_room_id ON hotel_industry.room_images (room_id);
