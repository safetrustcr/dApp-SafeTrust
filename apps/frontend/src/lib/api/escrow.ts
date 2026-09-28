import { auth } from '@/lib/firebase';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  'http://localhost:3002';

export class EscrowApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload: unknown,
  ) {
    super(message);
    this.name = 'EscrowApiError';
  }
}

/**
 * Sends an escrow command to the SafeTrust API with a freshly verified Firebase
 * ID token. The browser never receives the Trustless Work secret key.
 *
 * When `idempotencyKey` is supplied it is forwarded as the `Idempotency-Key`
 * header, letting the API replay a completed response instead of re-running the
 * action (and re-calling Trustless Work) after a retry.
 */
export async function postEscrowApi<T>(
  path: string,
  body: unknown,
  idempotencyKey?: string,
): Promise<T> {
  const user = auth.currentUser;
  if (!user) {
    throw new EscrowApiError('Sign in before performing an escrow action.', 401, null);
  }

  const token = await user.getIdToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : `Escrow request failed (${response.status}).`;
    throw new EscrowApiError(message, response.status, payload);
  }
  return payload as T;
}
