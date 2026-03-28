-- Repeatable acceptance checks for the user_wallets migration.
-- Run this against the local Postgres instance after Hasura has applied migrations.

BEGIN;

DO $$
DECLARE
    table_regclass REGCLASS;
    id_default TEXT;
    is_primary_default TEXT;
    created_at_default TEXT;
    updated_at_default TEXT;
    fk_definition TEXT;
    check_definition TEXT;
BEGIN
    SELECT to_regclass('public.user_wallets') INTO table_regclass;
    IF table_regclass IS NULL THEN
        RAISE EXCEPTION 'Expected table public.user_wallets to exist';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_wallets'
          AND column_name = 'id'
          AND data_type = 'uuid'
          AND is_nullable = 'NO'
    ) THEN
        RAISE EXCEPTION 'Column public.user_wallets.id is missing or has the wrong shape';
    END IF;

    SELECT pg_get_expr(ad.adbin, ad.adrelid)
    INTO id_default
    FROM pg_attribute attr
    JOIN pg_attrdef ad
      ON ad.adrelid = attr.attrelid
     AND ad.adnum = attr.attnum
    WHERE attr.attrelid = 'public.user_wallets'::regclass
      AND attr.attname = 'id';

    IF id_default IS NULL OR position('uuid_generate_v4()' IN id_default) = 0 THEN
        RAISE EXCEPTION 'Column public.user_wallets.id must default to uuid_generate_v4()';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_wallets'
          AND column_name = 'user_id'
          AND data_type = 'text'
    ) THEN
        RAISE EXCEPTION 'Column public.user_wallets.user_id is missing or has the wrong type';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_wallets'
          AND column_name = 'wallet_address'
          AND data_type = 'text'
          AND is_nullable = 'NO'
    ) THEN
        RAISE EXCEPTION 'Column public.user_wallets.wallet_address is missing or has the wrong shape';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_wallets'
          AND column_name = 'chain_type'
          AND data_type = 'text'
          AND is_nullable = 'NO'
    ) THEN
        RAISE EXCEPTION 'Column public.user_wallets.chain_type is missing or has the wrong shape';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_wallets'
          AND column_name = 'is_primary'
          AND data_type = 'boolean'
          AND is_nullable = 'YES'
    ) THEN
        RAISE EXCEPTION 'Column public.user_wallets.is_primary is missing or has the wrong shape';
    END IF;

    SELECT pg_get_expr(ad.adbin, ad.adrelid)
    INTO is_primary_default
    FROM pg_attribute attr
    JOIN pg_attrdef ad
      ON ad.adrelid = attr.attrelid
     AND ad.adnum = attr.attnum
    WHERE attr.attrelid = 'public.user_wallets'::regclass
      AND attr.attname = 'is_primary';

    IF is_primary_default IS NULL OR is_primary_default NOT IN ('false', 'FALSE') THEN
        RAISE EXCEPTION 'Column public.user_wallets.is_primary must default to false';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_wallets'
          AND column_name = 'created_at'
          AND data_type = 'timestamp with time zone'
          AND is_nullable = 'YES'
    ) THEN
        RAISE EXCEPTION 'Column public.user_wallets.created_at is missing or has the wrong shape';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_wallets'
          AND column_name = 'updated_at'
          AND data_type = 'timestamp with time zone'
          AND is_nullable = 'YES'
    ) THEN
        RAISE EXCEPTION 'Column public.user_wallets.updated_at is missing or has the wrong shape';
    END IF;

    SELECT pg_get_expr(ad.adbin, ad.adrelid)
    INTO created_at_default
    FROM pg_attribute attr
    JOIN pg_attrdef ad
      ON ad.adrelid = attr.attrelid
     AND ad.adnum = attr.attnum
    WHERE attr.attrelid = 'public.user_wallets'::regclass
      AND attr.attname = 'created_at';

    IF created_at_default IS NULL OR position('now()' IN lower(created_at_default)) = 0 THEN
        RAISE EXCEPTION 'Column public.user_wallets.created_at must default to now()';
    END IF;

    SELECT pg_get_expr(ad.adbin, ad.adrelid)
    INTO updated_at_default
    FROM pg_attribute attr
    JOIN pg_attrdef ad
      ON ad.adrelid = attr.attrelid
     AND ad.adnum = attr.attnum
    WHERE attr.attrelid = 'public.user_wallets'::regclass
      AND attr.attname = 'updated_at';

    IF updated_at_default IS NULL OR position('now()' IN lower(updated_at_default)) = 0 THEN
        RAISE EXCEPTION 'Column public.user_wallets.updated_at must default to now()';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.user_wallets'::regclass
          AND conname = 'user_wallets_pkey'
          AND contype = 'p'
    ) THEN
        RAISE EXCEPTION 'Primary key user_wallets_pkey is missing';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.user_wallets'::regclass
          AND conname = 'unique_wallet_address'
          AND contype = 'u'
    ) THEN
        RAISE EXCEPTION 'Unique constraint unique_wallet_address is missing';
    END IF;

    SELECT pg_get_constraintdef(oid)
    INTO check_definition
    FROM pg_constraint
    WHERE conrelid = 'public.user_wallets'::regclass
      AND conname = 'valid_chain_type'
      AND contype = 'c';

    IF check_definition IS NULL
       OR position('ETH' IN check_definition) = 0
       OR position('STELLAR' IN check_definition) = 0
       OR position('BSC' IN check_definition) = 0 THEN
        RAISE EXCEPTION 'Check constraint valid_chain_type is missing or incomplete';
    END IF;

    SELECT pg_get_constraintdef(oid)
    INTO fk_definition
    FROM pg_constraint
    WHERE conrelid = 'public.user_wallets'::regclass
      AND contype = 'f'
      AND conname = 'user_wallets_user_id_fkey';

    IF fk_definition IS NULL
       OR position('FOREIGN KEY (user_id)' IN fk_definition) = 0
       OR position('REFERENCES users(id)' IN fk_definition) = 0
       OR position('ON DELETE CASCADE' IN fk_definition) = 0 THEN
        RAISE EXCEPTION 'Foreign key user_wallets_user_id_fkey is missing or has the wrong definition';
    END IF;
END $$;

SELECT
    'public.user_wallets verification passed' AS status,
    COUNT(*)::INT AS column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_wallets';

ROLLBACK;