import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({ auth: { currentUser: null } }));

import { EscrowApiError } from '@/lib/api/escrow';
import { PollarSigningUnsupportedError, WalletRejectedError } from './errors';
import { apiErrorCode, describeSigningError, SIGNING_ERROR_MESSAGES } from './signing-error';

// Shape apps/api's errorHandler sends for ApiError(410, 'TRANSACTION_EXPIRED', ...).
const expiredProblem = {
  type: 'https://api.safetrust.dev/problems/transaction-expired',
  title: 'API error',
  status: 410,
  detail: 'Transaction expired. Build it again.',
  requestId: 'req-1',
};

describe('describeSigningError', () => {
  it('maps a wallet rejection to "You cancelled the signature."', () => {
    expect(describeSigningError(new WalletRejectedError())).toEqual({
      kind: 'rejected',
      message: 'You cancelled the signature.',
    });
  });

  it('maps 410 TRANSACTION_EXPIRED (Problem Details type) to the expiry message', () => {
    const error = new EscrowApiError(expiredProblem.detail, 410, expiredProblem);
    expect(describeSigningError(error)).toEqual({
      kind: 'expired',
      message: 'This transaction expired. Try again.',
    });
  });

  it('maps 410 with an explicit TRANSACTION_EXPIRED code field to the expiry message', () => {
    const error = new EscrowApiError('gone', 410, { code: 'TRANSACTION_EXPIRED' });
    expect(describeSigningError(error).kind).toBe('expired');
  });

  it('does not treat a 410 with another code as an expiry', () => {
    const error = new EscrowApiError('gone', 410, { type: 'https://api.safetrust.dev/problems/other-thing' });
    expect(describeSigningError(error)).toEqual({ kind: 'unknown', message: SIGNING_ERROR_MESSAGES.unknown });
  });

  it('maps a 409 conflict to "The escrow changed. Showing the latest status."', () => {
    const error = new EscrowApiError('Escrow changed. Refresh and retry', 409, { error: 'Escrow changed' });
    expect(describeSigningError(error)).toEqual({
      kind: 'conflict',
      message: 'The escrow changed. Showing the latest status.',
    });
  });

  it('keeps the existing Pollar message', () => {
    expect(describeSigningError(new PollarSigningUnsupportedError())).toEqual({
      kind: 'unsupported-wallet',
      message: "Signing with Pollar isn't available yet. Connect Freighter to sign this transaction.",
    });
  });

  it('falls back to a friendly message and never leaks the raw error text', () => {
    const raw = new Error('TypeError: Cannot read properties of undefined (reading "xdr") at sign.ts:12');
    const described = describeSigningError(raw);
    expect(described).toEqual({ kind: 'unknown', message: SIGNING_ERROR_MESSAGES.unknown });
    expect(described.message).not.toContain('TypeError');
    expect(describeSigningError('boom').kind).toBe('unknown');
    expect(describeSigningError(null).kind).toBe('unknown');
  });

  it('detects errors by type, not by message text', () => {
    // A plain Error that merely says "cancelled" is not a WalletRejectedError.
    expect(describeSigningError(new Error('Signature cancelled')).kind).toBe('unknown');
    // A 500 whose text mentions expiry is not a TRANSACTION_EXPIRED response.
    expect(describeSigningError(new EscrowApiError('Transaction expired', 500, null)).kind).toBe('unknown');
  });
});

describe('apiErrorCode', () => {
  it('reads code first, then derives it from the Problem Details type', () => {
    expect(apiErrorCode({ code: 'ACTION_IN_FLIGHT' })).toBe('ACTION_IN_FLIGHT');
    expect(apiErrorCode(expiredProblem)).toBe('TRANSACTION_EXPIRED');
    expect(apiErrorCode(null)).toBeNull();
    expect(apiErrorCode({ error: 'x' })).toBeNull();
  });
});
