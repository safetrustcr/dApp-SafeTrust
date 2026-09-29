CREATE TABLE IF NOT EXISTS hotel_industry.escrow_transactions (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id           UUID REFERENCES hotel_industry.reservations(id) ON DELETE RESTRICT,
    contract_id              TEXT UNIQUE,
    escrow_status            VARCHAR(200) NOT NULL DEFAULT 'PENDING',
    signer_address           VARCHAR(200),
    transaction_type         VARCHAR(150),
    escrow_transaction_type  VARCHAR(150),
    http_status_code         INTEGER,
    escrow_payload           JSONB,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escrow_transactions_reservation ON hotel_industry.escrow_transactions (reservation_id);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_status      ON hotel_industry.escrow_transactions (escrow_status);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_type        ON hotel_industry.escrow_transactions (transaction_type);
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_created_at  ON hotel_industry.escrow_transactions (created_at);
