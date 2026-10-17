import { auth } from '@/lib/firebase';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  'http://localhost:3002';

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export type ApiRequestOptions = {
  idempotencyKey?: string;
  headers?: Record<string, string>;
  method?: string;
};

export function parseApiError(responseStatus: number, payload: unknown): string {
  if (payload && typeof payload === 'object') {
    if ('error' in payload && typeof payload.error === 'string') {
      return payload.error;
    }
    if ('detail' in payload && typeof payload.detail === 'string') {
      return payload.detail;
    }
    if ('message' in payload && typeof payload.message === 'string') {
      return payload.message;
    }
  }
  return `Request failed (${responseStatus}).`;
}

/**
 * Sends an authenticated HTTP request to apps/api using a fresh Firebase ID token.
 */
export async function postAuthenticatedApi<T>(
  path: string,
  body?: unknown,
  options?: ApiRequestOptions,
): Promise<T> {
  const user = auth.currentUser;
  if (!user) {
    throw new ApiClientError('Sign in required.', 401, null);
  }

  const token = await user.getIdToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(options?.headers ?? {}),
  };

  if (options?.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options?.method ?? 'POST',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message = parseApiError(response.status, payload);
    throw new ApiClientError(message, response.status, payload);
  }

  return payload as T;
}
