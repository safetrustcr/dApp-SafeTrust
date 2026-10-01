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

-- 2. Drop the engagement-only unique index on the audit log.
--    The frontend passes engagementId on every action, so this index would
--    reject every action after the first (unique violation -> rollback).
--    (engagement_id, action) remains the duplicate guard: a second identical
--    transition's log insert fails and rolls the whole mutation back.
DROP INDEX IF EXISTS public.ux_escrow_transactions_engagement;
