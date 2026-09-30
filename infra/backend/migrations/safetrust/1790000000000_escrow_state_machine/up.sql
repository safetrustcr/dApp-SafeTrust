CREATE TABLE IF NOT EXISTS public.escrow_status_transitions (
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  PRIMARY KEY (from_status, to_status)
);

INSERT INTO public.escrow_status_transitions (from_status, to_status) VALUES
  ('created', 'funded'),
  ('funded', 'milestone_approved'),
  ('milestone_approved', 'completed'),
  ('funded', 'disputed'),
  ('milestone_approved', 'disputed'),
  ('disputed', 'resolved')
ON CONFLICT (from_status, to_status) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.escrow_milestone_status_transitions (
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  PRIMARY KEY (from_status, to_status)
);

INSERT INTO public.escrow_milestone_status_transitions (from_status, to_status) VALUES
  ('pending', 'completed'),
  ('completed', 'approved')
ON CONFLICT (from_status, to_status) DO NOTHING;

CREATE OR REPLACE FUNCTION public.enforce_escrow_status_transition()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT EXISTS (
    SELECT 1
    FROM public.escrow_status_transitions
    WHERE from_status = OLD.status AND to_status = NEW.status
  ) THEN
    RAISE EXCEPTION 'invalid escrow transition % -> %', OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_escrow_milestone_status_transition()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT EXISTS (
    SELECT 1
    FROM public.escrow_milestone_status_transitions
    WHERE from_status = OLD.status AND to_status = NEW.status
  ) THEN
    RAISE EXCEPTION 'invalid milestone transition % -> %', OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS escrows_status_transition ON public.escrows;
CREATE TRIGGER escrows_status_transition
  BEFORE UPDATE OF status ON public.escrows
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_escrow_status_transition();

DROP TRIGGER IF EXISTS trustless_work_escrows_status_transition ON public.trustless_work_escrows;
CREATE TRIGGER trustless_work_escrows_status_transition
  BEFORE UPDATE OF status ON public.trustless_work_escrows
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_escrow_status_transition();

DROP TRIGGER IF EXISTS escrow_milestones_status_transition ON public.escrow_milestones;
CREATE TRIGGER escrow_milestones_status_transition
  BEFORE UPDATE OF status ON public.escrow_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_escrow_milestone_status_transition();

ALTER TABLE public.escrows
  DROP CONSTRAINT IF EXISTS valid_escrow_status;

ALTER TABLE public.escrows
  ADD CONSTRAINT valid_escrow_status CHECK (status IN (
    'deploying',
    'pending_signature',
    'created',
    'funded',
    'milestone_approved',
    'completed',
    'disputed',
    'resolved',
    'cancelled'
  ));

ALTER TABLE public.escrow_milestones
  DROP CONSTRAINT IF EXISTS valid_milestone_status;

ALTER TABLE public.escrow_milestones
  ADD CONSTRAINT valid_milestone_status CHECK (status IN (
    'pending',
    'completed',
    'approved',
    'disputed',
    'released',
    'cancelled'
  ));

CREATE TABLE IF NOT EXISTS public.escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id TEXT,
  contract_id TEXT,
  from_status TEXT,
  to_status TEXT,
  action TEXT NOT NULL,
  tx_hash TEXT,
  source TEXT NOT NULL DEFAULT 'submit' CHECK (source IN ('submit', 'reconciler', 'admin')),
  actor_uid TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_escrow_transactions_engagement
  ON public.escrow_transactions (engagement_id)
  WHERE engagement_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_escrow_transactions_engagement_action
  ON public.escrow_transactions (engagement_id, action)
  WHERE engagement_id IS NOT NULL AND action IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_escrow_transactions_tx_hash
  ON public.escrow_transactions (tx_hash)
  WHERE tx_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_escrow_transactions_engagement_id
  ON public.escrow_transactions (engagement_id);

CREATE INDEX IF NOT EXISTS idx_escrow_transactions_contract_id
  ON public.escrow_transactions (contract_id);

CREATE INDEX IF NOT EXISTS idx_escrow_transactions_action
  ON public.escrow_transactions (action);

CREATE INDEX IF NOT EXISTS idx_escrow_transactions_created_at
  ON public.escrow_transactions (created_at);
