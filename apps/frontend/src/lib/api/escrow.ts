import { auth } from '@/lib/firebase';
import { postAuthenticatedApi, ApiClientError, API_BASE_URL } from './client';

export { API_BASE_URL };

export class EscrowApiError extends ApiClientError {
  constructor(
    message: string,
    status: number,
    payload: unknown,
  ) {
    super(message, status, payload);
    this.name = 'EscrowApiError';
  }
}

export type PostEscrowOptions = {
  /**
   * Idempotency-Key sent to the API. Callers that may retry the same user
   * action generate one key per attempt and reuse it; when omitted a fresh
   * key is generated for the request.
   */
  idempotencyKey?: string;
};

/**
 * Sends an escrow command to the SafeTrust API with a freshly verified Firebase
 * ID token. The browser never receives the Trustless Work secret key.
 */
export async function postEscrowApi<T>(
  path: string,
  body: unknown,
  options?: PostEscrowOptions,
): Promise<T> {
  const user = auth.currentUser;
  if (!user) {
    throw new EscrowApiError('Sign in before performing an escrow action.', 401, null);
  }

  try {
    return await postAuthenticatedApi<T>(path, body, {
      idempotencyKey: options?.idempotencyKey ?? crypto.randomUUID(),
    });
  } catch (error) {
    if (error instanceof ApiClientError && !(error instanceof EscrowApiError)) {
      throw new EscrowApiError(error.message, error.status, error.payload);
    }
    throw error;
  }
}
