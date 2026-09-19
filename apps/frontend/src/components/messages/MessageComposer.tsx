import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';

type MessageComposerProps = {
  conversationId: string;
  senderId: string;
  apartmentId: string;
};

export function MessageComposer({ conversationId }: MessageComposerProps) {
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!body.trim()) return;

    setIsSending(true);
    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          body: body.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setBody('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not send message. Please try again.",
      });
    } finally {
      setIsSending(false);
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
