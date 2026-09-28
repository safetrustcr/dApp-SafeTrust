-- Idempotency ledger for the escrow mutation endpoints.
--
-- One row per (user, Idempotency-Key). The API claims the key with
-- `INSERT ... ON CONFLICT DO NOTHING`, runs the handler, then stores the
-- response so a replay returns the original status/body without calling
-- Trustless Work a second time.
--
-- No client role permissions: only the API's admin-secret connection may read
-- or write this table.
CREATE TABLE IF NOT EXISTS public.api_idempotency_keys (
  user_id        TEXT        NOT NULL,
  key            TEXT        NOT NULL,
  route          TEXT        NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed')),
  response_code  INT,
  response_body  JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_api_idempotency_keys_created_at
  ON public.api_idempotency_keys (created_at);

COMMENT ON TABLE public.api_idempotency_keys IS
  'Per-user Idempotency-Key ledger for the escrow mutation endpoints';
COMMENT ON COLUMN public.api_idempotency_keys.status IS
  'in_progress while the handler runs; completed once the response is stored';
COMMENT ON COLUMN public.api_idempotency_keys.response_body IS
  'Replayed verbatim when the same key is retried after completion';
