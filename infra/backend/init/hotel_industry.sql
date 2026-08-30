-- ════════════════════════════════════════════════════════════════════════════
-- Init SQL for tenant: hotel_industry
-- Generated: 2026-08-27T23:40:19Z
-- Source:    infra/hasura/migrations/hotel_industry/*/up.sql
-- DO NOT EDIT — regenerate with: bin/generate-init-sql
-- ════════════════════════════════════════════════════════════════════════════

-- ── Migration: 1723171122097_create_hotels_table

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS hotels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(20) NOT NULL,
    description VARCHAR(50),
    address VARCHAR(50) NOT NULL,
    location_area VARCHAR(20),
    coordinates geometry(Point, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_hotels_name ON hotels(name);
CREATE INDEX idx_hotels_location_area ON hotels(location_area);
CREATE INDEX idx_hotels_coordinates ON hotels USING GIST (coordinates);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_updated_at
BEFORE UPDATE ON hotels
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ── Migration: 1723171122098_create_hotel_users

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for hotel_industry tenant
-- Note: hotel_id is intentionally excluded here.
-- It is added via a later ALTER TABLE migration after hotels table exists.
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid TEXT,
    email VARCHAR(150) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    phone_number VARCHAR(15),
    role VARCHAR(20) NOT NULL DEFAULT 'GUEST',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT valid_user_role CHECK (role IN ('GUEST', 'STAFF', 'MANAGER'))
);

CREATE INDEX IF NOT EXISTS idx_users_firebase_uid
    ON public.users(firebase_uid)
    WHERE firebase_uid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);


CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();
-- ── Migration: 1733171122097_create_room_types

-- Extensions — declared once at the top
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create room_types table
CREATE TABLE room_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(25) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name)
);

-- Index for performance (especially if you'll search by name)
CREATE INDEX idx_room_types_name ON room_types(name);

-- Grant permissions

GRANT SELECT ON public.room_types TO authenticated;
GRANT SELECT ON public.room_types TO service_role;
GRANT ALL ON public.room_types TO admin;

-- ── Migration: 1733171122099_create_rooms

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Rooms table with foreign key to Hotels
CREATE TABLE IF NOT EXISTS rooms (
    room_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    room_number VARCHAR(5) NOT NULL,
    room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE RESTRICT,
    price_night DECIMAL(10,2) NOT NULL CHECK (price_night > 0),
    capacity INTEGER NOT NULL,
    status BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(hotel_id, room_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rooms_hotel_id ON rooms(hotel_id);
CREATE INDEX IF NOT EXISTS idx_rooms_room_type ON rooms(room_type_id);

-- ── Migration: 1743029389869_create_users_wallets_table

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
-- Create users_wallets table with relationship to users table
CREATE TABLE IF NOT EXISTS users_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    wallet_address VARCHAR(255) NOT NULL,
    chain_type VARCHAR(50) NOT NULL, -- Changed from DATE to VARCHAR for blockchain network type
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraint
    CONSTRAINT fk_users_wallets_user_id FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    
    -- Unique constraint on wallet address
    CONSTRAINT users_wallets_address_unique UNIQUE (wallet_address)
);

-- Create indexes for performance
CREATE INDEX idx_users_wallets_user_id ON users_wallets(user_id);
CREATE INDEX idx_users_wallets_is_primary ON users_wallets(is_primary);

-- ── Migration: 1744160264002_track_nearby_hotels_function

CREATE OR REPLACE FUNCTION find_nearby_hotels(
    search_location POINT,
    radius_meters FLOAT,
    location_area VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    distance FLOAT,
    name VARCHAR(20),
    description VARCHAR(50),
    address VARCHAR(50),
    hotel_area VARCHAR(20), 
    coordinates POINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id,
        ST_Distance(
            h.coordinates::geometry, 
            search_location::geometry
        ) as distance,
        h.name,
        h.description,
        h.address,
        h.location_area,  
        h.coordinates
    FROM hotels h
    WHERE 
        h.coordinates IS NOT NULL
        AND ST_DWithin(
            h.coordinates::geometry,
            search_location::geometry,
            radius_meters
        )
        AND (location_area IS NULL OR h.location_area = location_area)
    ORDER BY distance;
END;
$$ LANGUAGE plpgsql STABLE;

-- ── Migration: 1745664202191_create_reservations

-- Create extension for UUID generation if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id UUID,
    wallet_address VARCHAR(255),
    room_id UUID REFERENCES rooms(room_id),
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    capacity INTEGER,
    reservation_status VARCHAR(15) DEFAULT 'PENDING',
    total_amount NUMERIC(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_id ON reservations(wallet_address);
CREATE INDEX idx_room_reservation_id ON reservations(room_id);
CREATE INDEX idx_reservation_status ON reservations(reservation_status);
CREATE INDEX idx_reservation_dates ON reservations(check_in, check_out);

-- ── Migration: 1745664202192_create_escrow_transactions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE escrow_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Foreign key relationships will be added later when related tables are ready
    reservation_id UUID,
    contract_id TEXT UNIQUE, 
    escrow_status VARCHAR(200) DEFAULT 'PENDING',
    signer_address VARCHAR(200),
    transaction_type VARCHAR(150),
    escrow_transaction_type VARCHAR(150),
    http_status_code INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_escrow_transactions_reservation ON escrow_transactions(reservation_id);
CREATE INDEX idx_escrow_transactions_status ON escrow_transactions(escrow_status);
CREATE INDEX idx_escrow_transactions_type ON escrow_transactions(transaction_type);
CREATE INDEX idx_escrow_transactions_created_at ON escrow_transactions(created_at);

ALTER TABLE escrow_transactions ADD CONSTRAINT fk_reservation FOREIGN KEY (reservation_id) REFERENCES reservations(id);

ALTER TABLE escrow_transactions
ADD COLUMN escrow_payload JSONB;
-- ── Migration: 1745664202193_create_escrow_transaction_users

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create the escrow_transaction_users table
CREATE TABLE escrow_transaction_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email VARCHAR(150) REFERENCES users(email),
    escrow_transaction_id UUID REFERENCES escrow_transactions(id),
    role VARCHAR(20),
    status VARCHAR(20),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_escrow_user_role UNIQUE (escrow_transaction_id, user_email, role)
);

-- Add a column to store the payload sent to TrustlessWork fund-escrow API
ALTER TABLE escrow_transactions
ADD COLUMN fund_payload JSONB;

-- Extend escrow_transaction_users to track funding status per user
ALTER TABLE escrow_transaction_users
ADD COLUMN funded_at TIMESTAMPTZ,
ADD COLUMN funding_status VARCHAR(20) DEFAULT 'PENDING';

-- Index for faster lookups
CREATE INDEX idx_escrow_transaction_users_transaction_id ON escrow_transaction_users(escrow_transaction_id);
CREATE INDEX idx_escrow_transaction_users_user_id ON escrow_transaction_users(user_email); 
CREATE INDEX idx_escrow_transaction_users_funding_status ON escrow_transaction_users(funding_status);

-- ── Migration: 1746439500253_create-room-images

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE room_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(room_id),
    image_url VARCHAR(150),
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_room_image_id ON room_images (room_id);

-- ── Migration: 1756195007000_create_top_rooms_function

-- Create function to get top 5 most reserved rooms
CREATE OR REPLACE FUNCTION get_top_rooms_by_reservations(
    time_period VARCHAR DEFAULT 'all',
    filter_status VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    room_id UUID,
    room_number VARCHAR(5),
    hotel_name VARCHAR(20),
    reservation_count BIGINT,
    total_revenue NUMERIC(12,2)
) AS $$
DECLARE
    date_filter TIMESTAMPTZ;
BEGIN
    -- Validate time_period parameter
    IF time_period NOT IN ('week', 'month', 'year', 'all') THEN
        RAISE EXCEPTION 'Invalid time_period. Must be one of: week, month, year, all';
    END IF;
    
    -- Calculate date filter based on time_period
    CASE time_period
        WHEN 'week' THEN
            date_filter := NOW() - INTERVAL '1 week';
        WHEN 'month' THEN
            date_filter := NOW() - INTERVAL '1 month';
        WHEN 'year' THEN
            date_filter := NOW() - INTERVAL '1 year';
        ELSE
            date_filter := '1970-01-01'::TIMESTAMPTZ; -- Beginning of time for 'all'
    END CASE;
    
    RETURN QUERY
    SELECT 
        r.room_id,
        r.room_number,
        h.name as hotel_name,
        COUNT(res.id) as reservation_count,
        COALESCE(SUM(res.total_amount), 0) as total_revenue
    FROM rooms r
    INNER JOIN hotels h ON r.hotel_id = h.id
    LEFT JOIN reservations res ON r.room_id = res.room_id 
        AND res.created_at >= date_filter
        AND (filter_status IS NULL OR res.reservation_status = filter_status)
    GROUP BY r.room_id, r.room_number, h.name
    HAVING COUNT(res.id) > 0  -- Only include rooms with reservations
    ORDER BY reservation_count DESC, total_revenue DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql STABLE;
-- ── Migration: 1756285113000_create_pricing_rules

-- Create Hotel Industry schema if not exists
CREATE SCHEMA IF NOT EXISTS hotel_industry;

-- Create Hotel Industry pricing rules table
CREATE TABLE hotel_industry.pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL,        -- 'ROOM_DEPOSIT', 'BOOKING_FEE', 'CANCELLATION_FEE', 'SERVICE_FEE', 'SEASONAL_RATE'
    currency VARCHAR(10) NOT NULL,         -- 'USD', 'EUR', 'USDC', etc.
    
    -- Pricing configuration
    base_amount DECIMAL(20,7) DEFAULT 0,   -- Fixed fee amount
    percentage DECIMAL(5,4) DEFAULT 0,     -- Percentage fee (e.g., 0.050 = 5%)
    min_amount DECIMAL(20,7) DEFAULT 0,    -- Minimum fee amount
    max_amount DECIMAL(20,7) DEFAULT 999999999, -- Maximum fee amount
    
    -- Hotel-specific fields
    room_type VARCHAR(50),                 -- 'STANDARD', 'DELUXE', 'SUITE', 'PRESIDENTIAL'
    season VARCHAR(30),                    -- 'HIGH_SEASON', 'LOW_SEASON', 'PEAK', 'OFF_PEAK'
    advance_booking_days INTEGER,          -- Days in advance for early booking discounts
    
    -- Rule management
    priority INTEGER DEFAULT 100,          -- Lower number = higher priority
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique rule per type/currency combination
    CONSTRAINT unique_hotel_rule_type_currency UNIQUE (rule_type, currency, room_type, season)
);

-- Performance indexes for common query patterns
CREATE INDEX idx_hotel_pricing_rules_type_currency_active 
ON hotel_industry.pricing_rules(rule_type, currency, is_active)
WHERE is_active = true;

CREATE INDEX idx_hotel_pricing_rules_room_season 
ON hotel_industry.pricing_rules(room_type, season, is_active)
WHERE is_active = true;

CREATE INDEX idx_hotel_pricing_rules_priority 
ON hotel_industry.pricing_rules(priority, is_active)
WHERE is_active = true;

CREATE INDEX idx_hotel_pricing_rules_advance_booking 
ON hotel_industry.pricing_rules(advance_booking_days, is_active)
WHERE is_active = true AND advance_booking_days IS NOT NULL;

-- Auto-update timestamp trigger
CREATE TRIGGER update_hotel_pricing_rules_updated_at 
    BEFORE UPDATE ON hotel_industry.pricing_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comment
COMMENT ON TABLE hotel_industry.pricing_rules IS 
'Pricing rules for Hotel Industry tenant - supports room deposits, booking fees, seasonal rates, and hospitality-specific pricing models';