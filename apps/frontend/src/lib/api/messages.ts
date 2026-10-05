import { auth } from '@/lib/firebase';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  'http://localhost:3002';

export class MessagesApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload: unknown,
  ) {
    super(message);
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
};

/**
 * Starts a conversation with an apartment host.
 * Sends a POST request to /api/messages/conversations with apartmentId.
 */
export async function startConversation(
  apartmentId: string,
  options?: StartConversationOptions,
): Promise<StartConversationResponse> {
  const user = auth.currentUser;
  if (!user) {
    throw new MessagesApiError('Sign in before messaging a host.', 401, null);
  }

  const token = await user.getIdToken();
  const idempotencyKey = options?.idempotencyKey ?? crypto.randomUUID();
  const response = await fetch(`${API_BASE_URL}/api/messages/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ apartmentId }),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : `Failed to start conversation (${response.status}).`;
    throw new MessagesApiError(message, response.status, payload);
  }
  return payload as StartConversationResponse;
}
