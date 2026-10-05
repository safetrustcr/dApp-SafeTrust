-- Automated escrow events are retried by reconciliation, so each event must
-- have a stable key protected by the database.
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS escrow_id UUID REFERENCES public.escrows(id) ON DELETE SET NULL;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS event_key TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'messages_conversation_event_key'
      AND conrelid = 'public.messages'::regclass
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_conversation_event_key UNIQUE (conversation_id, event_key);
  END IF;
END;
$$;

-- Hasura mutations commit when a conditional update matches zero rows. This
-- trigger ensures a lifecycle message cannot commit unless its confirmed state
-- is present in the same transaction.
CREATE OR REPLACE FUNCTION public.require_confirmed_escrow_message_state()
RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  contract_id TEXT;
  confirmed BOOLEAN := FALSE;
BEGIN
  IF NOT NEW.is_automated OR NEW.event_key IS NULL THEN
    RETURN NEW;
  END IF;

  contract_id := split_part(NEW.event_key, ':', 2);
  CASE NEW.event_type
    WHEN 'escrow_created' THEN
      SELECT EXISTS (SELECT 1 FROM public.escrows WHERE escrows.contract_id = contract_id AND status = 'created') INTO confirmed;
    WHEN 'escrow_funded' THEN
      SELECT EXISTS (SELECT 1 FROM public.escrows WHERE escrows.contract_id = contract_id AND status = 'funded') INTO confirmed;
    WHEN 'milestone_completed' THEN
      SELECT EXISTS (
        SELECT 1 FROM public.escrow_milestones m
        JOIN public.trustless_work_escrows t ON t.id = m.escrow_id
        WHERE t.contract_id = contract_id AND m.status = 'completed'
      ) INTO confirmed;
    WHEN 'milestone_approved' THEN
      SELECT EXISTS (SELECT 1 FROM public.escrows WHERE escrows.contract_id = contract_id AND status = 'milestone_approved') INTO confirmed;
    WHEN 'funds_released' THEN
      SELECT EXISTS (SELECT 1 FROM public.escrows WHERE escrows.contract_id = contract_id AND status = 'completed') INTO confirmed;
    WHEN 'dispute_opened' THEN
      SELECT EXISTS (SELECT 1 FROM public.escrows WHERE escrows.contract_id = contract_id AND status = 'disputed') INTO confirmed;
    WHEN 'dispute_resolved' THEN
      SELECT EXISTS (SELECT 1 FROM public.escrows WHERE escrows.contract_id = contract_id AND status = 'resolved') INTO confirmed;
    ELSE
      RETURN NEW;
  END CASE;

  IF NOT confirmed THEN
    RAISE EXCEPTION 'Automated escrow message requires a confirmed transition: %', NEW.event_key
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_require_confirmed_escrow_state ON public.messages;
CREATE TRIGGER messages_require_confirmed_escrow_state
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.require_confirmed_escrow_message_state();
