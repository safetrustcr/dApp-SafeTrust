DROP TRIGGER IF EXISTS users_set_updated_at ON hotel_industry.users;
DROP INDEX IF EXISTS hotel_industry.idx_hotel_industry_users_role;
DROP TABLE IF EXISTS hotel_industry.users;
DROP FUNCTION IF EXISTS hotel_industry.set_updated_at();
-- Schema drop is intentionally omitted here: later migrations in this
-- tenant still own objects inside hotel_industry when this migration
-- alone is rolled back.
