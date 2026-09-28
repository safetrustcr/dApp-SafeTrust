CREATE TABLE public.escrow_pending_actions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id   text        NOT NULL,
  contract_id     text,
  action          text        NOT NULL,
  tx_hash         text        NOT NULL UNIQUE,
  unsigned_xdr    text        NOT NULL,
  built_for_uid   text        NOT NULL,
  signer_address  text        NOT NULL,
  payload         jsonb       NOT NULL DEFAULT '{}'::jsonb,
  status          text        NOT NULL DEFAULT 'built',
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL,
  submitted_at    timestamptz,
  confirmed_at    timestamptz
);

CREATE UNIQUE INDEX escrow_pending_actions_live
  ON public.escrow_pending_actions (engagement_id, action)
  WHERE status IN ('built', 'submitted');
