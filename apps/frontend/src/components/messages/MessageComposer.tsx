import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useMutation, gql } from '@apollo/client';

const SEND_MESSAGE = gql`
  mutation SendMessage($conversationId: uuid!, $senderId: String!, $body: String!) {
    insert_messages_one(object: {
      conversation_id: $conversationId,
      sender_id: $senderId,
      body: $body
    }) {
      id
    }
  }
`;

type MessageComposerProps = {
  conversationId: string;
  senderId: string;
  apartmentId: string;
};

export function MessageComposer({ conversationId, senderId }: MessageComposerProps) {
  const [body, setBody] = useState('');
  const [sendMessage, { loading: isSending }] = useMutation(SEND_MESSAGE);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!body.trim() || body.length > 4000) return;

    try {
      await sendMessage({
        variables: {
          conversationId,
          senderId,
          body: body.trim(),
        }
      });
      setBody('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not send message. Please try again.",
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isNearLimit = body.length > 3900;
  const isOverLimit = body.length > 4000;

  return (
    <div className="p-4 border-t flex flex-col gap-2 mt-auto bg-background">
      <div className="flex gap-3 items-end">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className={`min-h-[60px] max-h-[120px] resize-none ${isOverLimit ? 'border-destructive' : ''}`}
          disabled={isSending}
          maxLength={4000}
        />
        <Button 
          size="icon" 
          onClick={handleSend} 
          disabled={!body.trim() || isSending || isOverLimit}
          className="h-10 w-10 shrink-0"
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">Send</span>
        </Button>
      </div>
      {isNearLimit && (
        <span className={`text-xs self-end ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
          {body.length} / 4000
        </span>
      )}
    </div>
  );
}
