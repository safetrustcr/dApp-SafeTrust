ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_conversation_event_key;

ALTER TABLE public.messages
  DROP COLUMN IF EXISTS event_key;

ALTER TABLE public.conversations
  DROP COLUMN IF EXISTS escrow_id;

DROP TRIGGER IF EXISTS messages_require_confirmed_escrow_state ON public.messages;
DROP FUNCTION IF EXISTS public.require_confirmed_escrow_message_state();
