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
  pending?: boolean;
  [key: string]: unknown;
};

const RECOVER_MAX_ATTEMPTS = 5;
const RECOVER_BASE_DELAY_MS = 500;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Recovers an escrow transaction that was signed and submitted but whose result
 * was never saved. Only the transaction hash is sent: the server derives the
 * action, escrow, amount and target status from its own pending-action row.
 *
 * A 202 response means the transaction is not yet on the ledger; this function
 * retries with exponential backoff and returns the final 202 payload if the
 * transaction is still pending after the attempts are exhausted.
 */
export async function recoverEscrowFromTxHash(
  tyHash: string,
  options?: PostEscrowOptions,
): Promise<RecoverFromTxHashResponse> {
  const normalizedHash = tyHash.trim();
  if (!/^[0-9a-f]{64}$/i.test(normalizedHash)) {
    throw new EscrowApiError('Invalid transaction hash.', 400, null);
  }

  const idempotencyKey = options?.idempotencyKey ?? crypto.randomUUID();

  let lastPendingResponse: RecoverFromTxHashResponse | null = null;

  for (let attempt = 0; attempt < RECOVER_MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await postEscrowApi<RecoverFromTxHashResponse>(
        '/api/escrow/recover-from-txhash',
        { txHash: normalizedHash },
        { idempotencyKey },
      );
      return result;
    } catch (error) {
      if (error instanceof EscrowApiError && error.status === 202) {
        lastPendingResponse = (error.payload as RecoverFromTxHashResponse | null) ?? {
          pending: true,
        };
        if (attempt < RECOVER_MAX_ATTEMPTS - 1) {
          await sleep(RECOVER_BASE_DELAY_MS * 2** attempt);
          continue;
        }
        return lastPendingResponse;
      }
      throw error;
    }
  }

  return lastPendingResponse ?? { pending: true };
}
