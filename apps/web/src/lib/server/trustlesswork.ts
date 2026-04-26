import { getErrorMessages } from '@/lib/trustlesswork-errors';

type TrustlessWorkRequestOptions = {
  method: 'POST' | 'PUT';
  body?: unknown;
};

export class TrustlessWorkRequestError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly messages: string[],
    public readonly payload?: unknown,
  ) {
    super(message);
  }
}

export function getTrustlessWorkBaseUrl() {
  return process.env.NEXT_PUBLIC_TRUSTLESS_WORK_ENV === 'mainnet'
    ? 'https://api.trustlesswork.com'
    : 'https://dev.api.trustlesswork.com';
}

function getTrustlessWorkApiKey() {
  const apiKey = process.env.NEXT_PUBLIC_TRUSTLESS_WORK_API_KEY;

  if (!apiKey) {
    throw new Error('Missing NEXT_PUBLIC_TRUSTLESS_WORK_API_KEY');
  }

  return apiKey;
}

export async function trustlessWorkRequest<T>(
  path: string,
  options: TrustlessWorkRequestOptions,
): Promise<T> {
  const response = await fetch(`${getTrustlessWorkBaseUrl()}${path}`, {
    method: options.method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getTrustlessWorkApiKey(),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const messages = getErrorMessages(payload, 'TrustlessWork request failed');
    throw new TrustlessWorkRequestError(messages.join(' '), response.status, messages, payload);
  }

  return payload as T;
}

export function extractTransactionHash(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const candidates = ['transactionHash', 'txHash', 'hash'] as const;

  for (const candidate of candidates) {
    const value = record[candidate];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return null;
}