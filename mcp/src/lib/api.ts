import { REQUEST_TIMEOUT_MS, SAFETRUST_API_URL } from '../config.js';
import { getFirebaseIdToken } from './firebase-session.js';

export class ApiRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export type ApiResponse<T> = {
  ok: boolean;
  status: number;
  data: T;
};

/**
 * Calls an apps/api route. Non-2xx responses come back as `ok: false` with the
 * parsed body so tools can surface the API's own error message; only transport
 * failures throw.
 */
export async function apiRequest<T = Record<string, unknown>>(
  path: string,
  init: {
    method: 'GET' | 'POST';
    body?: unknown;
    auth?: 'required';
    idempotencyKey?: string;
  } = { method: 'GET' },
): Promise<ApiResponse<T>> {
  const url = `${SAFETRUST_API_URL}${path}`;
  let response: Response;
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  if (init.auth === 'required') {
    headers.Authorization = `Bearer ${await getFirebaseIdToken()}`;
  }
  if (init.idempotencyKey) headers['Idempotency-Key'] = init.idempotencyKey;

  try {
    response = await fetch(url, {
      method: init.method,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: Object.keys(headers).length ? headers : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch (error) {
    throw new ApiRequestError(
      `Cannot reach apps/api at ${url} — is it running (pnpm --filter @safetrust/api dev)? ` +
        (error instanceof Error ? error.message : String(error)),
    );
  }

  const text = await response.text();
  let data: T;

  try {
    data = (text ? JSON.parse(text) : {}) as T;
  } catch {
    throw new ApiRequestError(
      `apps/api returned a non-JSON response (${response.status}): ${text.slice(0, 200)}`,
    );
  }

  return { ok: response.ok, status: response.status, data };
}
