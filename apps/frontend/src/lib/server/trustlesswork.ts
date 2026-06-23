const BASE_URL = process.env.TRUSTLESS_WORK_API_URL;
const API_KEY = process.env.TRUSTLESS_WORK_API_KEY;

if (!BASE_URL || !API_KEY) {
  throw new Error('Missing TRUSTLESS_WORK_API_URL or TRUSTLESS_WORK_API_KEY');
}

const _BASE_URL: string = BASE_URL;
const _API_KEY: string = API_KEY;

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

export async function trustlessWorkRequest<T>(
  path: string,
  options: TrustlessWorkRequestOptions = {},
): Promise<T> {
  const response = await fetch(`${_BASE_URL}${path}`, {
    method: options.method ?? 'POST',
    signal: AbortSignal.timeout(15_000),
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': _API_KEY,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const raw = await response.text();
  let data: T & Record<string, unknown>;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new TrustlessWorkRequestError(
      `TrustlessWork request to ${path} returned non-JSON response (status ${response.status}).`,
      response.status,
      ['Response body is not valid JSON.'],
    );
  }

  if (!response.ok) {
    const messages = [
      typeof data?.message === 'string' ? data.message : `TrustlessWork request to ${path} failed with status ${response.status}.`,
    ];
    throw new TrustlessWorkRequestError(messages[0], response.status, messages, data);
  }

  return data;
}
