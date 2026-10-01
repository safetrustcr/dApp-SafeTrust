CREATE TABLE IF NOT EXISTS public.escrow_transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id  TEXT        NOT NULL,
  contract_id    TEXT,
  action         TEXT        NOT NULL,
  from_status    TEXT,
  to_status      TEXT        NOT NULL,
  tx_hash        TEXT,
  source         TEXT        NOT NULL CHECK (source IN ('submit', 'reconciler', 'admin')),
  actor_uid      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id      VARCHAR(255) NOT NULL DEFAULT 'safetrust',
  
  -- From existing hotel_industry metadata
  reservation_id TEXT,
  escrow_status TEXT,
  signer_address TEXT,
  transaction_type TEXT,
  escrow_transaction_type TEXT,
  http_status_code INT,
  escrow_payload JSONB,
  fund_payload JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escrow_transactions_engagement
  ON public.escrow_transactions (engagement_id, created_at);

-- Append-only: audit rows are never edited or deleted
CREATE OR REPLACE FUNCTION public.escrow_transactions_append_only()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'escrow_transactions is append-only';
END;
$$;

CREATE TRIGGER escrow_transactions_no_update_delete
  BEFORE UPDATE OR DELETE ON public.escrow_transactions
  FOR EACH ROW EXECUTE FUNCTION public.escrow_transactions_append_only();
