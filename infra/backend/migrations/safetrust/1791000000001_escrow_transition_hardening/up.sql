-- App-level transition enforcement hardening (issue #454).
-- Data/index changes only — no new triggers.

-- 1. pending_signature -> created.
--    deploy inserts escrows rows as pending_signature; the send-transaction
--    initialize action normalizes them to created, so fund can rely on
--    created as its only valid `from` status.
INSERT INTO public.escrow_status_transitions (from_status, to_status)
VALUES ('pending_signature', 'created')
ON CONFLICT (from_status, to_status) DO NOTHING;

-- 1b. approved -> released (milestones).
--     dbReleaseFunds moves approved milestones to released; without this edge
--     the milestone transition trigger rejects every release.
INSERT INTO public.escrow_milestone_status_transitions (from_status, to_status)
VALUES ('approved', 'released')
ON CONFLICT (from_status, to_status) DO NOTHING;

-- 2. Drop the engagement-only and engagement+action unique indexes on the audit log.
--    The audit log is a per-transition ledger, so multiple transactions
--    for the same engagement and repeated reconciler rows must be permitted.
DROP INDEX IF EXISTS public.ux_escrow_transactions_engagement;
DROP INDEX IF EXISTS public.ux_escrow_transactions_engagement_action;
