-- Automated escrow events are retried by reconciliation, so each event must
-- have a stable key protected by the database.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS event_key TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'messages_event_key_key'
      AND conrelid = 'public.messages'::regclass
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_event_key_key UNIQUE (event_key);
  END IF;
END;
$$;
