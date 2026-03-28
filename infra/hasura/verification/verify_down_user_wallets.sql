-- Acceptance check for the user_wallets DOWN migration.
-- Confirms that DROP TABLE IF EXISTS user_wallets; was executed correctly.
-- Run *after* applying the down migration; the table must be gone.

DO $$
BEGIN
    IF to_regclass('public.user_wallets') IS NOT NULL THEN
        RAISE EXCEPTION
            'public.user_wallets still exists – down migration was not applied correctly';
    END IF;
END $$;

SELECT 'public.user_wallets down-migration verified: table is absent' AS status;
