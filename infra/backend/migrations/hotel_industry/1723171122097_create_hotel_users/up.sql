-- Schema for the hotel_industry tenant. Every hotel object lives here —
-- never in public — so the hotel_industry Hasura source has a single,
-- unambiguous home for its tables.
CREATE SCHEMA IF NOT EXISTS hotel_industry;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;

-- Shared updated_at trigger for hotel_industry tables.
CREATE OR REPLACE FUNCTION hotel_industry.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS hotel_industry.users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid  TEXT UNIQUE,
    email         VARCHAR(150) NOT NULL UNIQUE,
    first_name    VARCHAR(50),
    last_name     VARCHAR(50),
    phone_number  VARCHAR(20),
    role          VARCHAR(20) NOT NULL DEFAULT 'GUEST'
                    CHECK (role IN ('GUEST', 'STAFF', 'MANAGER')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotel_industry_users_role ON hotel_industry.users (role);

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON hotel_industry.users
  FOR EACH ROW EXECUTE FUNCTION hotel_industry.set_updated_at();
