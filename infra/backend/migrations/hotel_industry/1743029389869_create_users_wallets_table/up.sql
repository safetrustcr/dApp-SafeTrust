CREATE TABLE IF NOT EXISTS hotel_industry.users_wallets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES hotel_industry.users(id) ON DELETE CASCADE,
    wallet_address  VARCHAR(255) NOT NULL,
    chain_type      VARCHAR(50) NOT NULL,
    is_primary      BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT users_wallets_address_unique UNIQUE (wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_users_wallets_user_id    ON hotel_industry.users_wallets (user_id);
CREATE INDEX IF NOT EXISTS idx_users_wallets_is_primary ON hotel_industry.users_wallets (is_primary);

CREATE TRIGGER users_wallets_set_updated_at
  BEFORE UPDATE ON hotel_industry.users_wallets
  FOR EACH ROW EXECUTE FUNCTION hotel_industry.set_updated_at();
