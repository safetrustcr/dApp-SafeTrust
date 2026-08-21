export class TrustlessWorkRequestError extends Error {
  statusCode: number;
  messages?: string[];
  payload?: unknown;

  constructor(message: string, statusCode: number, messages?: string[], payload?: unknown) {
    super(message);
    this.name = 'TrustlessWorkRequestError';
    this.statusCode = statusCode;
    this.messages = messages;
    this.payload = payload;
  }
}

type TrustlessWorkRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
};

export function extractTransactionHash(result: Record<string, unknown>): string | null {
  if (typeof result.transactionHash === 'string' && result.transactionHash.length > 0) {
    return result.transactionHash;
  }
  if (typeof result.txHash === 'string' && result.txHash.length > 0) {
    return result.txHash;
  }
  if (typeof result.hash === 'string' && result.hash.length > 0) {
    return result.hash;
  }
  return null;
}

export async function trustlessWorkRequest<T>(
  path: string,
  options: TrustlessWorkRequestOptions = {},
): Promise<T> {
  const baseUrl = process.env.TRUSTLESS_WORK_API_URL;
  const apiKey = process.env.TRUSTLESS_WORK_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new TrustlessWorkRequestError(
      'Missing TRUSTLESS_WORK_API_URL or TRUSTLESS_WORK_API_KEY environment variables',
      500
    );
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? 'POST',
      signal: AbortSignal.timeout(15_000),
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new TrustlessWorkRequestError(
        `TrustlessWork request to ${path} timed out after 15s.`,
        504,
        ['Request to TrustlessWork timed out.'],
      );
    }
    throw err;
  }

  const raw = await response.text();
  let data: T & Record<string, unknown>;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new TrustlessWorkRequestError(
      `TrustlessWork request to ${path} returned non-JSON response (status ${response.status}).`,
      response.status >= 500 ? response.status : 502,
      ['Response body is not valid JSON.'],
    );
  }

  if (!response.ok) {
    const messages = [
      typeof data?.message === 'string'
        ? data.message
        : `TrustlessWork request to ${path} failed with status ${response.status}.`,
    ];
    throw new TrustlessWorkRequestError(messages[0], response.status, messages, data);
  }

  return data;
}

type ErrorLikePayload = {
  error?: unknown;
  message?: unknown;
  messages?: unknown;
};

function isErrorLikePayload(value: unknown): value is ErrorLikePayload {
  return typeof value === 'object' && value !== null;
}

function toMessages(values: unknown[]): string[] {
  return values
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function getErrorMessages(source: unknown, fallback: string): string[] {
  const safeFallback = fallback.trim() || 'Something went wrong.';

  if (Array.isArray(source)) {
    const messages = toMessages(source);
    return messages.length > 0 ? messages : [safeFallback];
  }

  if (isErrorLikePayload(source)) {
    if (Array.isArray(source.messages)) {
      const messages = toMessages(source.messages);
      if (messages.length > 0) return messages;
    }

    if (typeof source.error === 'string' && source.error.trim()) {
      return [source.error.trim()];
    }

    if (typeof source.message === 'string' && source.message.trim()) {
      return [source.message.trim()];
    }
  }

  if (source instanceof Error && source.message.trim()) {
    return [source.message.trim()];
  }

  if (typeof source === 'string' && source.trim()) {
    return [source.trim()];
  }

  return [safeFallback];
}
