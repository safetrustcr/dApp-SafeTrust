-- Replay store for the Idempotency-Key header on escrow endpoints
-- (deploy, fund, milestone-status, approve-milestone, release-funds,
-- send-transaction). One row per (user_id, key); the API writes it with the
-- Hasura admin secret only — no client role permissions are granted.

CREATE TABLE IF NOT EXISTS public.api_idempotency_keys (
  user_id        TEXT        NOT NULL,
  key            TEXT        NOT NULL,
  route          TEXT        NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'in_progress'
                             CHECK (status IN ('in_progress', 'completed')),
  response_code  INT,
  response_body  JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);

COMMENT ON TABLE public.api_idempotency_keys IS
  'Replay store for escrow endpoint Idempotency-Key headers. Admin-secret only.';
