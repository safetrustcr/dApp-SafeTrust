import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { startConversation, sendMessage, markRead } from '@/lib/api/messages';

type MessageComposerProps = {
  conversationId?: string;
  senderId?: string;
  apartmentId?: string;
  onMessageSent?: (message?: unknown) => void;
  onConversationCreated?: (conversationId: string) => void;
};

export function MessageComposer({
  conversationId: initialConversationId,
  apartmentId,
  onMessageSent,
  onConversationCreated,
}: MessageComposerProps) {
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState(initialConversationId ?? '');
  const { toast } = useToast();

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;

    setIsSending(true);
    try {
      let targetConversationId = activeConversationId || initialConversationId;

      if (!targetConversationId && apartmentId) {
        const convoResult = await startConversation(apartmentId);
        targetConversationId = convoResult.conversationId;
        setActiveConversationId(targetConversationId);
        onConversationCreated?.(targetConversationId);
      }

      if (!targetConversationId) {
        throw new Error('No active conversation');
      }

      const sendResult = await sendMessage(targetConversationId, trimmed);
      setBody('');
      onMessageSent?.(sendResult.message);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not send message. Please try again.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleFocus = async () => {
    const targetId = activeConversationId || initialConversationId;
    if (targetId) {
      try {
        await markRead(targetId);
      } catch {
        // Silently catch focus mark-read errors
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 border-t mt-auto flex gap-3 items-end bg-background">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        className="min-h-[60px] max-h-[120px] resize-none"
        disabled={isSending}
      />
      <Button 
        size="icon" 
        onClick={handleSend} 
        disabled={!body.trim() || isSending}
        className="h-10 w-10 shrink-0"
      >
        <Send className="h-4 w-4" />
        <span className="sr-only">Send</span>
      </Button>
    </div>
  );
}
