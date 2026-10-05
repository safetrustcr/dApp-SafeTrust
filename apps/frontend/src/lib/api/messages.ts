import { postAuthenticatedApi, ApiClientError, type ApiRequestOptions } from './client';

export class MessagesApiError extends ApiClientError {
  constructor(message: string, status: number, payload: unknown) {
    super(message, status, payload);
    this.name = 'MessagesApiError';
  }
}

export type StartConversationOptions = {
  /**
   * Idempotency-Key sent to the API. Callers that may retry the same user
   * action generate one key per attempt and reuse it; when omitted a fresh
   * key is generated for the request.
   */
  idempotencyKey?: string;
};

export type StartConversationResponse = {
  conversationId: string;
  created?: boolean;
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
  options?: StartConversationOptions,
): Promise<StartConversationResponse> {
  return postAuthenticatedApi<StartConversationResponse>(
    '/api/messages/conversations',
    { apartmentId },
    options?.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : undefined,
  );
}

/**
 * Sends a message in a conversation.
 * The server validates participant status, enforces body length, and updates the caller's last read timestamp.
 */
export async function sendMessage(
  conversationId: string,
  body: string,
  options?: ApiRequestOptions,
): Promise<SendMessageResponse> {
  return postAuthenticatedApi<SendMessageResponse>(
    '/api/messages/send',
    { conversationId, body },
    options,
  );
}

/**
 * Marks a conversation as read for the authenticated participant.
 */
export async function markRead(conversationId: string): Promise<void> {
  return postAuthenticatedApi<void>(
    `/api/messages/conversations/${encodeURIComponent(conversationId)}/read`,
  );
}
