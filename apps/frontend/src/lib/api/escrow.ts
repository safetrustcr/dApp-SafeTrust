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

export type RecoverFromTxHashResponse = {
  status?: string;
  escrowStatus?: string;
  txHash?: string;
  [key: string]: unknown;
};

export type RecoverFromTxHashOptions = {
  /** Maximum number of attempts when the API replies 202 PENDING. Defaults to 6 */
  maxAttempts?: number;
  /** Base delay in ms between retries. Defaults to 1000 */
  baseDelayMs?: number;
  /** Maximum delay in ms between retries. Defaults to 16000 */
  maxDelayMs?: number;
  /** Optional abort signal to cancel pending retries. */
  signal?: AbortSignal;
  /** Optional callback invoked before each retry delay. */
  onPending?: (attempt: number, payload: RecoverFromTxHashResponse) => void;
};

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Recovers an escrow transaction that was signed and submitted but whose
 * result was never persisted (for example, the tab closed).
 *
 * The API derives everything from the pending action row and the ledger,
 * so the request body must contain only the transaction hash. When the
 * transaction is not yet on the ledger the API replies 202 PENDING and this
 * helper retries with exponential backoff until it gets a definitive result.
 */
export async function recoverEscrowFromTxHash(
  txHash: string,
  options?: RecoverFromTxHashOptions,
): Promise<RecoverFromTxHashResponse> {
  const maxAttempts = Math.max(1, options?.maxAttempts ?? 6);
  const baseDelayMs = Math.max(0, options?.baseDelayMs ?? 1000);
  const maxDelayMs = Math.max(baseDelayMs, options?.maxDelayMs ?? 16000);
  const signal = options?.signal;

  let lastPendingPayload: RecoverFromTxHashResponse = { txHash };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await postEscrowApi<{
        status?: string;
        escrowStatus?: string;
        txHash?: string;
        [key: string]: unknown;
      }>('/api/escrow/recover-from-txhash', { txHash });
      return result;
    } catch (error) {
      if (!(error instanceof EscrowApiError) || error.status !== 202) {
        throw error;
      }

      lastPendingPayload =
        (error.payload as RecoverFromTxHashResponse | null) ?? { txHash };
      options?.onPending?.(attempt, lastPendingPayload);

      if (attempt >= maxAttempts) {
        break;
      }

      const delay = Math.min(maxDelayMs, baseDelayMs * 2** (attempt - 1));
      await sleep(delay, signal);
    }
  }

  // Exhausted retries while the transaction is still pending on the ledger.
  // Surface the last 202 so the caller can decide to keep waiting or the cron
  // reconciler will pick it up.
  throw new EscrowApiError(
    'Transaction is still pending on the ledger.',
    202,
    lastPendingPayload,
  );
}
