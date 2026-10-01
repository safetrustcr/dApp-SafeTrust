-- Recreate the engagement-only unique index dropped by the up migration.
CREATE UNIQUE INDEX IF NOT EXISTS ux_escrow_transactions_engagement
  ON public.escrow_transactions (engagement_id)
  WHERE engagement_id IS NOT NULL;

DELETE FROM public.escrow_status_transitions
WHERE from_status = 'pending_signature' AND to_status = 'created';

DELETE FROM public.escrow_milestone_status_transitions
WHERE from_status = 'approved' AND to_status = 'released';
