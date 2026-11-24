-- 1. conversations: one thread per apartment per host–guest pair
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  host_id TEXT NOT NULL REFERENCES public.users(id),
  guest_id TEXT NOT NULL REFERENCES public.users(id),
  escrow_id UUID REFERENCES public.trustless_work_escrows(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
  last_message_at TIMESTAMPTZ,
  host_last_read_at TIMESTAMPTZ,
  guest_last_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id VARCHAR(255) NOT NULL DEFAULT 'safetrust',
  CONSTRAINT conversations_unique_pair UNIQUE (apartment_id, host_id, guest_id),
  CONSTRAINT conversations_host_guest_different CHECK (host_id <> guest_id)
);

CREATE INDEX idx_conversations_host ON public.conversations (host_id, last_message_at DESC NULLS LAST);
CREATE INDEX idx_conversations_guest ON public.conversations (guest_id, last_message_at DESC NULLS LAST);
CREATE INDEX idx_conversations_apartment ON public.conversations (apartment_id);
CREATE INDEX idx_conversations_escrow ON public.conversations (escrow_id) WHERE escrow_id IS NOT NULL;

-- 2. keep last_message_at current (function BEFORE the trigger that uses it)
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.conversations
  SET
    last_message_at = GREATEST(COALESCE(last_message_at, NEW.created_at), NEW.created_at),
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- 3. messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES public.users(id),
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0 AND char_length(body) <= 4000),
  is_automated BOOLEAN NOT NULL DEFAULT false,
  event_type VARCHAR(100),
  event_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id VARCHAR(255) NOT NULL DEFAULT 'safetrust',
  -- Manual messages carry no event metadata; automated ones must carry both
  CONSTRAINT messages_automated_fields CHECK (
    (is_automated = false AND event_type IS NULL AND event_key IS NULL)
    OR
    (is_automated = true AND event_key IS NOT NULL AND event_type IN (
      'escrow_created',
      'escrow_funded',
      'milestone_completed',
      'milestone_approved',
      'funds_released',
      'dispute_opened',
      'dispute_resolved'
    ))
  ),
  -- Idempotency for lifecycle events. NULL event_keys (manual messages) never conflict.
  CONSTRAINT messages_conversation_event_key UNIQUE (conversation_id, event_key)
);

CREATE INDEX idx_messages_conversation_created ON public.messages (conversation_id, created_at DESC);

CREATE TRIGGER messages_update_conversation_last_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_last_message();

-- 4. unread count as a Hasura computed field (per logged-in user)
CREATE OR REPLACE FUNCTION public.conversation_unread_count(c public.conversations, hasura_session JSON)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::int
  FROM public.messages m
  WHERE m.conversation_id = c.id
    AND m.sender_id <> (hasura_session ->> 'x-hasura-user-id')
    AND m.created_at > COALESCE(
      CASE
        WHEN c.host_id = (hasura_session ->> 'x-hasura-user-id') THEN c.host_last_read_at
        ELSE c.guest_last_read_at
      END,
      'epoch'::timestamptz
    );
$$;

-- 5. system sender for lifecycle messages (adjust columns to the users table)
INSERT INTO public.users (id, email)
VALUES ('safetrust-system', 'system@safetrust.invalid')
ON CONFLICT (id) DO NOTHING;
