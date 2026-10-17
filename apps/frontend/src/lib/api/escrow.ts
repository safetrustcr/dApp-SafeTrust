import { auth } from '@/lib/firebase';
import { postAuthenticatedApi, getAuthenticatedApi, ApiClientError, API_BASE_URL } from './client';

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

export type ReadinessCheck = {
  ok: boolean;
  balance?: string;
  required?: string;
  fix?: string;
};

export type GuestChecks = {
  registeredWallet: { ok: boolean; fix?: string };
  accountExists?: ReadinessCheck;
  xlmForFees?: ReadinessCheck;
  trustline?: ReadinessCheck;
  assetBalance?: ReadinessCheck;
};

export type WalletReadiness = {
  ready: boolean;
  network: 'testnet' | 'mainnet';
  asset: {
    code: string;
    issuer: string;
  };
  amount: string;
  guest: {
    wallet: string | null;
    checks: GuestChecks;
  };
  counterparties: {
    hostCanReceive: { ok: boolean };
    platformCanReceive: { ok: boolean };
  };
};

export type ReadinessParams = {
  apartmentId?: string;
  reservationId?: string;
};

export async function getReadiness(params: ReadinessParams): Promise<WalletReadiness> {
  const user = auth.currentUser;
  if (!user) {
    throw new EscrowApiError('Sign in before performing an escrow action.', 401, null);
  }

  const query = params.apartmentId
    ? `apartmentId=${encodeURIComponent(params.apartmentId)}`
    : `reservationId=${encodeURIComponent(params.reservationId!)}`;

  try {
    return await getAuthenticatedApi<WalletReadiness>(`/api/escrow/readiness?${query}`);
  } catch (error) {
    if (error instanceof ApiClientError && !(error instanceof EscrowApiError)) {
      throw new EscrowApiError(error.message, error.status, error.payload);
    }
    throw error;
  }
}

export async function buildTrustlineXdr(walletAddress?: string): Promise<{ unsignedXdr: string }> {
  const user = auth.currentUser;
  if (!user) {
    throw new EscrowApiError('Sign in before performing an escrow action.', 401, null);
  }

  try {
    return await postAuthenticatedApi<{ unsignedXdr: string }>('/api/escrow/readiness/trustline', {
      walletAddress,
    });
  } catch (error) {
    if (error instanceof ApiClientError && !(error instanceof EscrowApiError)) {
      throw new EscrowApiError(error.message, error.status, error.payload);
    }
    throw error;
  }
}

