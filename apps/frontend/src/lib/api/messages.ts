import { postAuthenticatedApi } from './client';

export type StartConversationResponse = {
  conversationId: string;
  created: boolean;
};

export type MessageItem = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  is_automated: boolean;
  event_type?: string | null;
  created_at: string;
};

export type SendMessageResponse = {
  message: MessageItem;
};

/**
 * Starts or retrieves an existing conversation for an apartment.
 * The server derives the host from the apartment record and sets the guest to the authenticated user.
 */
export async function startConversation(
  apartmentId: string,
): Promise<StartConversationResponse> {
  return postAuthenticatedApi<StartConversationResponse>(
    '/api/messages/conversations',
    { apartmentId },
  );
}

/**
 * Sends a message in a conversation.
 * The server validates participant status, enforces body length, and updates the caller's last read timestamp.
 */
export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<SendMessageResponse> {
  return postAuthenticatedApi<SendMessageResponse>('/api/messages/send', {
    conversationId,
    body,
  });
}

/**
 * Marks a conversation as read for the authenticated participant.
 */
export async function markRead(conversationId: string): Promise<void> {
  return postAuthenticatedApi<void>(
    `/api/messages/conversations/${encodeURIComponent(conversationId)}/read`,
  );
}
