-- A staff user can work at one or more hotels. The membership is the
-- authorization boundary for the hotel_staff Hasura role.
CREATE TABLE IF NOT EXISTS hotel_industry.hotel_staff_memberships (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id   UUID NOT NULL REFERENCES hotel_industry.hotels(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES hotel_industry.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (hotel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_hotel_staff_memberships_user_hotel
    ON hotel_industry.hotel_staff_memberships (user_id, hotel_id);
