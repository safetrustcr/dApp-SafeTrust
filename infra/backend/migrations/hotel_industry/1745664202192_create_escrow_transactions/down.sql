DROP TRIGGER IF EXISTS escrow_transactions_set_updated_at ON hotel_industry.escrow_transactions;
DROP INDEX IF EXISTS hotel_industry.idx_escrow_transactions_created_at;
DROP INDEX IF EXISTS hotel_industry.idx_escrow_transactions_type;
DROP INDEX IF EXISTS hotel_industry.idx_escrow_transactions_status;
DROP INDEX IF EXISTS hotel_industry.idx_escrow_transactions_reservation;
DROP TABLE IF EXISTS hotel_industry.escrow_transactions;
