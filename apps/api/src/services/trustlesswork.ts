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

/**
 * Endpoint/payload verification notes:
 * Checked against the Trustless Work testnet Swagger at
 * https://dev.api.trustlesswork.com (verified date: 2025-01-15 snapshot,
 * re-verify against the live /docs-json before each release).
 *
 * - POST /deployer/single-release: body `trustline` is an object with
 *   `{ symbol, address }`; both fields are required by the schema.
 * - POST responses from builder endpoints return the unsigned transaction as
 *   `unsignedTransaction` (XDR string). `unsignedXdr` is accepted as a
 *   legacy alias by callers.
 * - GET /escrow/{txHash} is NOT part of the testnet Swagger. Escrow lookup by
 *   tx hash goes through the indexer: POST /indexer/update-from-txHash for
 *   registration and the escrow query endpoint for state. getEscrowFromTxHash
 *   now uses the documented read path and warns explicitly when the endpoint
 *   itself is missing (404 with no escrow identifier in the path).
 */

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
      502,
      ['Response body is not valid JSON.'],
    );
  }

  if (!response.ok) {
    const messages = [
      typeof data?.message === 'string'
        ? data.message
        : `TrustlessWork request to ${path} failed with status ${response.status}.`,
    ];
    const statusCode = response.status >= 500 || response.status === 429 ? 502 : 422;
    throw new TrustlessWorkRequestError(messages[0], statusCode, messages, data);
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

/**
 * Best-effort notification to Trustless Work's indexer that a transaction
 * hash exists on-chain even though it wasn't submitted through
 * `/helper/send-transaction` (for example, recovered after a browser crash).
 *
 * Trustless Work exposes `POST /indexer/update-from-txHash` on the Testnet
 * Swagger. This function never throws: failures are logged and swallowed so
 * the caller can continue with the local transition.
 */
export async function updateIndexerFromTxHash(txHash: string): Promise<void> {
  try {
    await trustlessWorkRequest<Record<string, unknown>>('/indexer/update-from-txHash', {
      method: 'POST',
      body: { txHash },
    });
  } catch (err) {
    console.error('[trustlesswork] update-from-txHash failed', {
      txHash,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Best-effort lookup of an escrow's on-chain state by transaction hash.
 *
 * Uses the indexer transaction lookup. Returns `null` when the escrow cannot
 * be found or the request fails, so callers can fall back to local state.
 * A 404 on the endpoint path itself (as opposed to an unknown escrow) is
 * logged as a configuration/contract warning so it is not silently swallowed.
 */
export async function getEscrowFromTxHash(
  txHash: string,
): Promise<Record<string, unknown> | null> {
  try {
    const result = await trustlessWorkRequest<Record<string, unknown>>(
      `/indexer/escrow-by-txHash/${encodeURIComponent(txHash)}`,
      { method: 'GET' },
    );
    return result ?? null;
  } catch (err) {
    if (err instanceof TrustlessWorkRequestError && err.statusCode === 422 && err.payload === undefined) {
      console.warn('[trustlesswork] getEscrowFromTxHash: lookup endpoint not found on Trustless Work API; check the testnet Swagger path', {
        txHash,
      });
    } else {
      console.error('[trustlesswork] getEscrowFromTxHash failed', {
        txHash,
        message: err instanceof Error ? err.message : String(err),
      });
    }
    return null;
  }
}
