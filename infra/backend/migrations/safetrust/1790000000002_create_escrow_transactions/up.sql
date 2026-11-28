-- Ensure escrow_transactions exists and has all required audit log and multi-tenant columns
CREATE TABLE IF NOT EXISTS public.escrow_transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id  TEXT,
  contract_id    TEXT,
  action         TEXT NOT NULL,
  from_status    TEXT,
  to_status      TEXT,
  tx_hash        TEXT,
  source         TEXT NOT NULL DEFAULT 'submit' CHECK (source IN ('submit', 'reconciler', 'admin')),
  actor_uid      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.escrow_transactions
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(255) NOT NULL DEFAULT 'safetrust',
  ADD COLUMN IF NOT EXISTS reservation_id TEXT,
  ADD COLUMN IF NOT EXISTS escrow_status TEXT,
  ADD COLUMN IF NOT EXISTS signer_address TEXT,
  ADD COLUMN IF NOT EXISTS transaction_type TEXT,
  ADD COLUMN IF NOT EXISTS escrow_transaction_type TEXT,
  ADD COLUMN IF NOT EXISTS http_status_code INT,
  ADD COLUMN IF NOT EXISTS escrow_payload JSONB,
  ADD COLUMN IF NOT EXISTS fund_payload JSONB,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_escrow_transactions_engagement
  ON public.escrow_transactions (engagement_id, created_at);

-- Append-only: audit rows are never edited or deleted
CREATE OR REPLACE FUNCTION public.escrow_transactions_append_only()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'escrow_transactions is append-only';
END;
$$;

DROP TRIGGER IF EXISTS escrow_transactions_no_update_delete ON public.escrow_transactions;
CREATE TRIGGER escrow_transactions_no_update_delete
  BEFORE UPDATE OR DELETE ON public.escrow_transactions
  FOR EACH ROW EXECUTE FUNCTION public.escrow_transactions_append_only();
