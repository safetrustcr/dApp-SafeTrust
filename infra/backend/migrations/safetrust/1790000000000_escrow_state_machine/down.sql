DROP TRIGGER IF EXISTS escrows_status_transition ON public.escrows;
DROP TRIGGER IF EXISTS trustless_work_escrows_status_transition ON public.trustless_work_escrows;
DROP TRIGGER IF EXISTS escrow_milestones_status_transition ON public.escrow_milestones;

DROP FUNCTION IF EXISTS public.enforce_escrow_status_transition();
DROP FUNCTION IF EXISTS public.enforce_escrow_milestone_status_transition();

ALTER TABLE public.escrows
  DROP CONSTRAINT IF EXISTS valid_escrow_status;

ALTER TABLE public.escrow_milestones
  DROP CONSTRAINT IF EXISTS valid_milestone_status;

ALTER TABLE public.escrows
  ADD CONSTRAINT valid_escrow_status CHECK (status IN (
    'deploying',
    'pending_signature',
    'funded',
    'completed',
    'disputed',
    'resolved',
    'cancelled'
  ));

ALTER TABLE public.escrow_milestones
  ADD CONSTRAINT valid_milestone_status CHECK (status IN (
    'pending',
    'approved',
    'disputed',
    'released',
    'cancelled'
  ));

DROP INDEX IF EXISTS public.ux_escrow_transactions_tx_hash;
DROP INDEX IF EXISTS public.ux_escrow_transactions_engagement_action;
DROP INDEX IF EXISTS public.ux_escrow_transactions_engagement;
DROP TABLE IF EXISTS public.escrow_transactions;
DROP TABLE IF EXISTS public.escrow_milestone_status_transitions;
DROP TABLE IF EXISTS public.escrow_status_transitions;
