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
 * Endpoint contract verification.
 *
 * Paths and payload shapes used by this module and its callers were checked
 * against the Trustless Work testnet Swagger at https://dev.api.trustlesswork.com
 * (checked against the Swagger document available at the time of this change;
 * re-verify when the Swagger is republished).
 *
 * Known endpoint shapes:
 *   - POST /deployer/single-release      body.trustline is { symbol, address }
 *   - POST /helper/send-transaction      accepts a signed XDR
 *   - POST /indexer/update-from-txHash   body { txHash }
 *   - Build endpoints return either `unsignedXdr` or `unsignedTransaction`;
 *     callers must accept both (see build-escrow-action.ts).
 *
 * `GET /escrow/{txHash}` is NOT a documented Swagger path. Escrow state by
 * hash is resolved via the indexer lookup below instead.
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
 * Never throws: failures are logged and swallowed so the caller can continue
 * with the local transition.
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
 * Returns `null` when the escrow cannot be found or the request fails. A 404
 * from the endpoint itself (path not present on the API) is logged as a
 * configuration/contract warning, distinct from an unknown escrow.
 */
export async function getEscrowFromTxHash(
  txHash: string,
): Promise<Record<string, unknown> | null> {
  try {
    const result = await trustlessWorkRequest<Record<string, unknown>>(
      `/escrow/${encodeURIComponent(txHash)}`,
      { method: 'GET' },
    );
    return result ?? null;
  } catch (err) {
    if (err instanceof TrustlessWorkRequestError && err.statusCode === 422 && isEndpointNotFound(err)) {
      console.warn('[trustlesswork] getEscrowFromTxHash: endpoint /escrow/{txHash} returned 404; the path may not exist on this Trustless Work API version', {
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

function isEndpointNotFound(err: TrustlessWorkRequestError): boolean {
  const payload = err.payload as { statusCode?: unknown; error?: unknown } | undefined;
  return payload?.statusCode === 404 || payload?.error === 'Not Found';
}
