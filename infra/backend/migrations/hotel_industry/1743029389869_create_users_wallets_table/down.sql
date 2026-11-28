DROP TRIGGER IF EXISTS users_wallets_set_updated_at ON hotel_industry.users_wallets;
DROP INDEX IF EXISTS hotel_industry.idx_users_wallets_is_primary;
DROP INDEX IF EXISTS hotel_industry.idx_users_wallets_user_id;
DROP TABLE IF EXISTS hotel_industry.users_wallets;
