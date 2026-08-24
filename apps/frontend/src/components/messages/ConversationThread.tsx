'use client';

import { useSubscription, useMutation } from '@apollo/client';
import { useEffect, useRef } from 'react';
import { useAuthUser } from '@/components/auth/hooks/auth.hook';
import {
  SUBSCRIBE_CONVERSATION_MESSAGES,
  MARK_MESSAGES_READ,
} from '@/graphql/queries/messages-queries';
import { MessageBubble } from './MessageBubble';
import { AutomatedEventMessage } from './AutomatedEventMessage';
import { MessageComposer } from './MessageComposer';
import type { CSSProperties } from 'react';

type Message = {
  id: string;
  body: string;
  is_automated: boolean;
  event_type: string | null;
  read_at: string | null;
  created_at: string;
  sender: { id: string; first_name: string; last_name: string; email: string };
};

type ConversationThreadProps = {
  conversationId: string;
  apartmentId: string;
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    maxHeight: 'calc(100vh - 12rem)',
  } satisfies CSSProperties,
  messageList: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
  } satisfies CSSProperties,
} as const;

export function ConversationThread({
  conversationId,
  apartmentId,
}: ConversationThreadProps) {
  const { user } = useAuthUser();
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, loading } = useSubscription<{ messages: Message[] }>(
    SUBSCRIBE_CONVERSATION_MESSAGES,
    { variables: { conversationId } }
  );

  const [markRead] = useMutation(MARK_MESSAGES_READ);

  // Mark messages as read when thread opens
  useEffect(() => {
    if (user?.uid) {
      markRead({ variables: { conversationId, userId: user.uid } });
    }
  }, [conversationId, user?.uid, markRead]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages.length]);

  const messages = data?.messages ?? [];

  return (
    <div style={styles.container}>
      <div style={styles.messageList}>
        {loading && <p style={{ color: '#9ca3af', textAlign: 'center' }}>Loading messages…</p>}

        {messages.map((message) =>
          message.is_automated ? (
            <AutomatedEventMessage key={message.id} message={message} />
          ) : (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.sender.id === user?.uid}
            />
          )
        )}

        <div ref={bottomRef} />
      </div>

      <MessageComposer
        conversationId={conversationId}
        senderId={user?.uid ?? ''}
        apartmentId={apartmentId}
      />
    </div>
  );
}
