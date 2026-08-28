ALTER TABLE public.user_wallets
  DROP CONSTRAINT IF EXISTS valid_wallet_provider;

ALTER TABLE public.user_wallets
  DROP COLUMN IF EXISTS provider;
