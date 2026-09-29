ALTER TABLE hotel_industry.escrow_transactions DROP COLUMN IF EXISTS fund_payload;

DROP INDEX IF EXISTS hotel_industry.idx_escrow_transaction_users_funding_status;
DROP INDEX IF EXISTS hotel_industry.idx_escrow_transaction_users_user_email;
DROP INDEX IF EXISTS hotel_industry.idx_escrow_transaction_users_transaction_id;
DROP TABLE IF EXISTS hotel_industry.escrow_transaction_users;
