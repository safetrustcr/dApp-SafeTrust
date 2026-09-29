CREATE TABLE IF NOT EXISTS hotel_industry.escrow_transaction_users (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email             VARCHAR(150) REFERENCES hotel_industry.users(email) ON DELETE RESTRICT,
    escrow_transaction_id  UUID REFERENCES hotel_industry.escrow_transactions(id) ON DELETE CASCADE,
    role                   VARCHAR(20),
    status                 VARCHAR(20),
    is_primary             BOOLEAN NOT NULL DEFAULT false,
    funded_at              TIMESTAMPTZ,
    funding_status         VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_escrow_user_role UNIQUE (escrow_transaction_id, user_email, role)
);

CREATE INDEX IF NOT EXISTS idx_escrow_transaction_users_transaction_id ON hotel_industry.escrow_transaction_users (escrow_transaction_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transaction_users_user_email     ON hotel_industry.escrow_transaction_users (user_email);
CREATE INDEX IF NOT EXISTS idx_escrow_transaction_users_funding_status ON hotel_industry.escrow_transaction_users (funding_status);

-- Payload sent to TrustlessWork's fund-escrow API, tracked per transaction.
ALTER TABLE hotel_industry.escrow_transactions ADD COLUMN IF NOT EXISTS fund_payload JSONB;
