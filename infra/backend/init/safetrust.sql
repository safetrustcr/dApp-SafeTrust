-- ════════════════════════════════════════════════════════════════════════════
-- Init SQL for tenant: safetrust
-- Generated: 2026-08-27T23:40:18Z
-- Source:    infra/hasura/migrations/safetrust/*/up.sql
-- DO NOT EDIT — regenerate with: bin/generate-init-sql
-- ════════════════════════════════════════════════════════════════════════════

-- ── Migration: 1731908059919_create_uuid_extension

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Migration: 1731908676359_create_users

CREATE TABLE public.users (
    id TEXT PRIMARY KEY,  -- IS the Firebase UID
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone_number TEXT,
    country_code TEXT,
    location TEXT,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX idx_users_email ON public.users(email);
-- ── Migration: 1731909024829_create_user_wallets

CREATE TABLE public.user_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL,
    chain_type TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_wallet_address UNIQUE (wallet_address),
    CONSTRAINT valid_chain_type CHECK (chain_type IN ('STELLAR'))
);
-- ── Migration: 1731909059420_create_trustless_work_escrows

-- Migration: Create Trustless Work Escrows Table
-- Description: Sets up the main table for tracking escrow transactions between 
--              Hotels, Guests, and the Platform using Trustless Work protocols.
-- Author: emarc99

-- ============================================================================
-- 1. TABLE DEFINITION
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trustless_work_escrows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Trustless Work standard fields (align with blocks)
  contract_id VARCHAR(255) UNIQUE NOT NULL,
  marker VARCHAR(255) NOT NULL,           -- Hotel wallet address
  approver VARCHAR(255) NOT NULL,         -- Guest wallet address
  releaser VARCHAR(255) NOT NULL,         -- Platform wallet address
  resolver VARCHAR(255),                  -- Dispute resolver address

  -- Escrow configuration
  escrow_type VARCHAR(50) NOT NULL CHECK (escrow_type IN ('single_release', 'multi_release')),
  status VARCHAR(50) NOT NULL,
  asset_code VARCHAR(10) NOT NULL DEFAULT 'USDC',
  asset_issuer VARCHAR(255),
  amount DECIMAL(20, 7) NOT NULL,
  balance DECIMAL(20, 7) DEFAULT 0,

  -- Hotel booking specific fields
  booking_id VARCHAR(255), -- References hotel_bookings(id)
  room_id VARCHAR(255),
  hotel_id VARCHAR(255),
  guest_id VARCHAR(255),

  -- Booking timeline
  check_in_date TIMESTAMP WITH TIME ZONE,
  check_out_date TIMESTAMP WITH TIME ZONE,
  booking_created_at TIMESTAMP WITH TIME ZONE,

  -- Escrow metadata (JSON for flexibility)
  escrow_metadata JSONB,                  -- Trustless Work escrow data
  booking_metadata JSONB,                 -- Hotel booking specific data

  -- Tracking fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tenant_id VARCHAR(255) NOT NULL DEFAULT 'safetrust',

  -- Status constraints
  CONSTRAINT valid_escrow_status CHECK (status IN (
    'created', 'pending_funding', 'funded', 'active',
    'milestone_approved', 'completed', 'disputed', 'resolved', 'cancelled'
  ))
);

-- ============================================================================
-- 2. PERFORMANCE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_trustless_escrows_booking_id ON public.trustless_work_escrows(booking_id);
CREATE INDEX IF NOT EXISTS idx_trustless_escrows_status ON public.trustless_work_escrows(status);
CREATE INDEX IF NOT EXISTS idx_trustless_escrows_hotel_id ON public.trustless_work_escrows(hotel_id);
CREATE INDEX IF NOT EXISTS idx_trustless_escrows_guest_id ON public.trustless_work_escrows(guest_id);
CREATE INDEX IF NOT EXISTS idx_trustless_escrows_tenant ON public.trustless_work_escrows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trustless_escrows_created_at ON public.trustless_work_escrows(created_at);

-- ============================================================================
-- 3. DOCUMENTATION (PostgreSQL Comments)
-- ============================================================================
COMMENT ON TABLE public.trustless_work_escrows IS 'Trustless Work escrow transactions for hotel bookings';
COMMENT ON COLUMN public.trustless_work_escrows.contract_id IS 'Unique identifier from Trustless Work smart contract';
COMMENT ON COLUMN public.trustless_work_escrows.marker IS 'Hotel wallet address that marks/creates the escrow';
COMMENT ON COLUMN public.trustless_work_escrows.approver IS 'Guest wallet address that approves milestones';
COMMENT ON COLUMN public.trustless_work_escrows.releaser IS 'Platform wallet address that releases funds';

-- ── Migration: 1731909059421_create_escrow_milestones

-- Create escrow milestones table for multi-release escrows
-- Note: This migration depends on the public.trustless_work_escrows table existing first
CREATE TABLE IF NOT EXISTS public.escrow_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id UUID NOT NULL REFERENCES public.trustless_work_escrows(id) ON DELETE CASCADE,
  milestone_id VARCHAR(255) NOT NULL,     -- 'check_in', 'check_out', etc.
  description TEXT NOT NULL,
  amount DECIMAL(20, 7) NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by VARCHAR(255),               -- Wallet address of approver
  released_at TIMESTAMP WITH TIME ZONE,
  released_by VARCHAR(255),               -- Wallet address of releaser
  metadata JSONB,                         -- Milestone-specific data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tenant_id VARCHAR(255) NOT NULL DEFAULT 'safetrust',

  -- Constraints
  CONSTRAINT valid_milestone_status CHECK (status IN (
    'pending', 'approved', 'disputed', 'released', 'cancelled'
  )),
  CONSTRAINT unique_escrow_milestone UNIQUE(escrow_id, milestone_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_milestones_escrow_id ON public.escrow_milestones(escrow_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON public.escrow_milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestones_due_date ON public.escrow_milestones(due_date);
CREATE INDEX IF NOT EXISTS idx_milestones_milestone_id ON public.escrow_milestones(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestones_tenant ON public.escrow_milestones(tenant_id);

-- Add comments
COMMENT ON TABLE public.escrow_milestones IS 'Milestone tracking for multi-release escrows';
COMMENT ON COLUMN public.escrow_milestones.milestone_id IS 'Business milestone identifier (check_in, check_out, etc.)';
COMMENT ON COLUMN public.escrow_milestones.approved_by IS 'Wallet address that approved this milestone';
COMMENT ON COLUMN public.escrow_milestones.released_by IS 'Wallet address that released funds for this milestone';

-- ── Migration: 1731909059422_create_trustless_work_webhook_events

-- Migration: Create Trustless Work Webhook Events Table
-- Description: Sets up the infrastructure for receiving, tracking, and retrying 
--              webhook events from the Trustless Work platform.
-- Author: emarc99

-- ============================================================================
-- 1. TABLE DEFINITION
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trustless_work_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id VARCHAR(255),
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  signature VARCHAR(255),
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tenant_id VARCHAR(255) NOT NULL DEFAULT 'safetrust',
  
  -- Validation constraints
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0),
  CONSTRAINT valid_max_retries CHECK (max_retries >= 0)
);

-- ============================================================================
-- 2. PERFORMANCE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_webhook_events_contract_id ON public.trustless_work_webhook_events(contract_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON public.trustless_work_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON public.trustless_work_webhook_events(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON public.trustless_work_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_retry ON public.trustless_work_webhook_events(retry_count, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_tenant ON public.trustless_work_webhook_events(tenant_id);

-- ============================================================================
-- 3. DOCUMENTATION (PostgreSQL Comments)
-- ============================================================================
COMMENT ON TABLE public.trustless_work_webhook_events IS 'Webhook events from Trustless Work for audit and debugging';
COMMENT ON COLUMN public.trustless_work_webhook_events.event_type IS 'Type of webhook event (escrow.created, milestone.approved, etc.)';
COMMENT ON COLUMN public.trustless_work_webhook_events.signature IS 'HMAC signature for webhook verification';
COMMENT ON COLUMN public.trustless_work_webhook_events.next_retry_at IS 'Timestamp for next retry attempt if processing failed';

-- ── Migration: 1732588166945_create_apartments

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;


CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';
-- Create apartments table
CREATE TABLE public.apartments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    warranty_deposit DECIMAL(10,2) NOT NULL CHECK (warranty_deposit > 0),
    coordinates POINT NOT NULL,
    location_area GEOMETRY(POLYGON, 4326),
    address JSONB NOT NULL,
    is_available BOOLEAN DEFAULT true,
    available_from TIMESTAMP WITH TIME ZONE NOT NULL,
    available_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_date_range 
        CHECK (available_until IS NULL OR available_from < available_until)
);

-- Alter table query: add image_urls array to apartments table
ALTER TABLE public.apartments
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';
 
COMMENT ON COLUMN public.apartments.image_urls
  IS 'Array of image URL strings for the apartment listing';

-- Create spatial index
CREATE INDEX idx_apartments_coordinates 
    ON public.apartments USING GIST (coordinates);
CREATE INDEX idx_apartments_location_area 
    ON public.apartments USING GIST (location_area);

-- Create regular indexes
CREATE INDEX idx_apartments_owner 
    ON public.apartments(owner_id);
CREATE INDEX idx_apartments_availability 
    ON public.apartments(is_available, available_from, available_until);
CREATE INDEX idx_apartments_price 
    ON public.apartments(price);

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create update trigger for updated_at
CREATE TRIGGER update_apartments_updated_at
    BEFORE UPDATE ON public.apartments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
-- ── Migration: 1732865994413_create_bid_tables

CREATE TABLE public.bid_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    current_status TEXT NOT NULL DEFAULT 'PENDING',
    proposed_price DECIMAL(10,2) NOT NULL CHECK (proposed_price > 0),
    desired_move_in TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_status CHECK (
        current_status IN (
            'PENDING',
            'VIEWED',
            'APPROVED',
            'CONFIRMED',
            'ESCROW_FUNDED',
            'ESCROW_COMPLETED',
            'CANCELLED'
        )
    )
);

CREATE TABLE public.bid_status_histories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bid_request_id UUID REFERENCES public.bid_requests(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    notes TEXT,
    changed_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION record_bid_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') OR (OLD.current_status IS DISTINCT FROM NEW.current_status) THEN
        INSERT INTO public.bid_status_histories (
            bid_request_id,
            status,
            changed_by
        ) VALUES (
            NEW.id,
            NEW.current_status,
            (SELECT tenant_id from public.bid_requests WHERE id = NEW.id)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to record status changes
CREATE TRIGGER record_bid_status
    AFTER INSERT OR UPDATE ON public.bid_requests
    FOR EACH ROW
    EXECUTE FUNCTION record_bid_status_change();

CREATE INDEX idx_bid_requests_apartment ON public.bid_requests(apartment_id);
CREATE INDEX idx_bid_requests_tenant ON public.bid_requests(tenant_id);
CREATE INDEX idx_bid_requests_status ON public.bid_requests(current_status);
CREATE INDEX idx_bid_requests_dates ON public.bid_requests(created_at, desired_move_in);
CREATE INDEX idx_bid_histories_request ON public.bid_status_histories(bid_request_id);
CREATE INDEX idx_bid_histories_dates ON public.bid_status_histories(created_at);

CREATE TRIGGER update_bid_requests_updated_at
    BEFORE UPDATE ON public.bid_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION check_active_bids()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.current_status IN ('PENDING', 'VIEWED', 'APPROVED') THEN
        IF EXISTS (
            SELECT 1 FROM public.bid_requests
            WHERE tenant_id = NEW.tenant_id
            AND id != NEW.id
            AND current_status IN ('PENDING', 'VIEWED', 'APPROVED')
            AND deleted_at IS NULL
        ) THEN
            RAISE EXCEPTION 'Tenant already has an active bid';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE UNIQUE INDEX ux_bid_requests_one_active_per_tenant
ON public.bid_requests (tenant_id)
WHERE deleted_at IS NULL
  AND current_status IN ('PENDING', 'VIEWED', 'APPROVED');


-- Trigger to prevent multiple active offers
CREATE TRIGGER check_tenant_active_bids
    BEFORE INSERT OR UPDATE ON public.bid_requests
    FOR EACH ROW
    EXECUTE FUNCTION check_active_bids();
-- ── Migration: 1771690624593_create_escrows_table

-- Single-release escrow contracts for security deposits
CREATE TABLE IF NOT EXISTS public.escrows (
    id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id       TEXT         NOT NULL,
    engagement_id     TEXT         NOT NULL,
    property_id       TEXT         NOT NULL,
    sender_address    TEXT         NOT NULL,
    receiver_address  TEXT         NOT NULL,
    amount            NUMERIC(20, 7) NOT NULL CHECK (amount > 0),
    status            TEXT         NOT NULL DEFAULT 'pending_signature',
    unsigned_xdr      TEXT,
    created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    tenant_id         VARCHAR(255) NOT NULL DEFAULT 'safetrust',
    CONSTRAINT valid_escrow_status CHECK (status IN (
        'deploying',
        'pending_signature',
        'funded',
        'completed',
        'disputed',
        'resolved',
        'cancelled'
    )),
    CONSTRAINT unique_engagement UNIQUE (engagement_id)
);


-- Add apartment_id FK to escrows
ALTER TABLE public.escrows
  ADD COLUMN IF NOT EXISTS apartment_id UUID
  REFERENCES public.apartments(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_escrows_apartment_id ON public.escrows(apartment_id);
CREATE INDEX IF NOT EXISTS idx_escrows_contract_id      ON public.escrows (contract_id);
CREATE INDEX IF NOT EXISTS idx_escrows_property_id      ON public.escrows (property_id);
CREATE INDEX IF NOT EXISTS idx_escrows_sender_address   ON public.escrows (sender_address);
CREATE INDEX IF NOT EXISTS idx_escrows_receiver_address ON public.escrows (receiver_address);
CREATE INDEX IF NOT EXISTS idx_escrows_status           ON public.escrows (status);
CREATE INDEX IF NOT EXISTS idx_escrows_tenant           ON public.escrows (tenant_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_escrows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS escrows_set_updated_at ON public.escrows;
CREATE TRIGGER escrows_set_updated_at
    BEFORE UPDATE ON public.escrows
    FOR EACH ROW EXECUTE FUNCTION public.set_escrows_updated_at();

-- Comments
COMMENT ON COLUMN public.escrows.apartment_id IS 'FK to apartments — the property this escrow covers';
COMMENT ON TABLE  public.escrows IS 'Single-release escrow contracts for security deposits';
COMMENT ON COLUMN public.escrows.contract_id    IS 'On-chain Stellar contract address';
COMMENT ON COLUMN public.escrows.engagement_id  IS 'Unique identifier sent to TrustlessWork API';
COMMENT ON COLUMN public.escrows.sender_address IS 'Tenant Stellar public key (signer)';
COMMENT ON COLUMN public.escrows.unsigned_xdr   IS 'Unsigned XDR returned to client for wallet signing';

-- ── Migration: 1778200000000_cast_escrow_wallet_columns_to_text

ALTER TABLE public.trustless_work_escrows
  ALTER COLUMN marker   TYPE TEXT,
  ALTER COLUMN approver TYPE TEXT,
  ALTER COLUMN releaser TYPE TEXT,
  ALTER COLUMN resolver TYPE TEXT;

-- ── Migration: 1778300000001_add_provider_to_user_wallets

ALTER TABLE public.user_wallets
  ADD COLUMN provider TEXT NOT NULL DEFAULT 'external';

ALTER TABLE public.user_wallets
  ADD CONSTRAINT valid_wallet_provider
  CHECK (provider IN ('external', 'pollar', 'freighter'));

-- ── Migration: 1786000000000_create_user_roles

-- Role catalogue. `name` is the stable identifier consumed by the frontend
-- middleware (guest | host | admin); ids are an implementation detail.
CREATE TABLE public.roles (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT roles_name_key UNIQUE (name)
);

INSERT INTO public.roles (name, description) VALUES
    ('guest', 'Default role: can browse and book apartments'),
    ('host', 'Can list apartments and manage escrows as receiver'),
    ('admin', 'Platform administrator')
ON CONFLICT (name) DO NOTHING;

-- A user may hold several roles at once (a host is still able to book as a
-- guest). Role resolution picks the highest-privilege row, see
-- apps/frontend/src/lib/middleware/fetch-user-role.ts.
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT user_roles_user_id_role_id_key UNIQUE (user_id, role_id)
);

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON public.user_roles(role_id);

-- ── Migration: 1787000000000_create_escrow_analytics_function

-- Migration: Create get_escrow_analytics_by_day stored function
-- Aggregates trustless_work_webhook_events by day for the Analytics Dashboard.
-- pageViews  = total webhook events for the day
-- clicks     = processed webhook events for the day
-- users      = distinct users with activity (last_seen) on that day

CREATE OR REPLACE FUNCTION public.get_escrow_analytics_by_day(
  p_start_date DATE,
  p_end_date   DATE,
  p_tenant_id  TEXT DEFAULT 'safetrust'
)
RETURNS TABLE (
  day        DATE,
  page_views BIGINT,
  clicks     BIGINT,
  users      BIGINT
)
LANGUAGE sql STABLE
AS $$
  WITH date_series AS (
    SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date AS day
  ),
  event_counts AS (
    SELECT
      created_at::date AS day,
      COUNT(*)                                              AS page_views,
      COUNT(*) FILTER (WHERE processed IS TRUE)             AS clicks
    FROM public.trustless_work_webhook_events
    WHERE created_at::date BETWEEN p_start_date AND p_end_date
      AND tenant_id = p_tenant_id
    GROUP BY created_at::date
  ),
  user_counts AS (
    SELECT
      last_seen::date AS day,
      COUNT(DISTINCT id) AS users
    FROM public.users
    WHERE last_seen::date BETWEEN p_start_date AND p_end_date
    GROUP BY last_seen::date
  )
  SELECT
    ds.day,
    COALESCE(ec.page_views, 0) AS page_views,
    COALESCE(ec.clicks, 0)     AS clicks,
    COALESCE(uc.users, 0)      AS users
  FROM date_series ds
  LEFT JOIN event_counts ec ON ec.day = ds.day
  LEFT JOIN user_counts uc ON uc.day = ds.day
  ORDER BY ds.day;
$$;
