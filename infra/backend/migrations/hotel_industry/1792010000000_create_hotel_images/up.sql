-- Hotel-level photos are separate from room-level photos.
CREATE TABLE hotel_industry.hotel_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES hotel_industry.hotels(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL CHECK (length(trim(image_url)) > 0 AND length(image_url) <= 700000),
  content_hash TEXT GENERATED ALWAYS AS (md5(image_url)) STORED,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0 AND position < 8),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hotel_images_unique_content UNIQUE (hotel_id, content_hash),
  CONSTRAINT hotel_images_unique_position UNIQUE (hotel_id, position)
);

CREATE INDEX idx_hotel_images_hotel_id ON hotel_industry.hotel_images(hotel_id);
COMMENT ON TABLE hotel_industry.hotel_images IS 'Hotel-level images; room photos remain in room_images. Writes are managed through the hotel API.';
