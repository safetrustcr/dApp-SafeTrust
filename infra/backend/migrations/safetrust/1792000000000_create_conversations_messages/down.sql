DROP TRIGGER IF EXISTS messages_update_conversation_last_message ON public.messages;
DROP FUNCTION IF EXISTS public.conversation_unread_count(public.conversations, JSON);
DROP TABLE IF EXISTS public.messages;
DROP FUNCTION IF EXISTS public.update_conversation_last_message();
DROP TABLE IF EXISTS public.conversations;
DELETE FROM public.users WHERE id = 'safetrust-system';
