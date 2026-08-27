ALTER TABLE public.user_wallets
  ADD COLUMN provider TEXT NOT NULL DEFAULT 'external';

ALTER TABLE public.user_wallets
  ADD CONSTRAINT valid_wallet_provider
  CHECK (provider IN ('external', 'pollar', 'freighter'));
