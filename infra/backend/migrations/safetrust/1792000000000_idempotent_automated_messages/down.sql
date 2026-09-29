ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_event_key_key;

ALTER TABLE public.messages
  DROP COLUMN IF EXISTS event_key;
