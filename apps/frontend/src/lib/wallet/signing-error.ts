import { ApiClientError } from '@/lib/api/client';
import { PollarSigningUnsupportedError, WalletRejectedError } from './errors';

export type SigningErrorKind = 'rejected' | 'expired' | 'conflict' | 'unsupported-wallet' | 'unknown';

export type SigningErrorDescription = {
  kind: SigningErrorKind;
  /** Plain-language message that is safe to show the user. */
  message: string;
};

export const SIGNING_ERROR_MESSAGES = {
  rejected: 'You cancelled the signature.',
  expired: 'This transaction expired. Try again.',
  conflict: 'The escrow changed. Showing the latest status.',
  unknown: 'Something went wrong while processing this transaction. Try again.',
} as const;

/**
 * Read the API's machine-readable error code from a response body.
 *
 * apps/api sends RFC 7807 Problem Details whose `type` is derived from the
 * error code (`TRANSACTION_EXPIRED` → `.../problems/transaction-expired`).
 * A plain `code` field is honoured first in case a route sends one.
 */
export function apiErrorCode(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const body = payload as { code?: unknown; type?: unknown };
  if (typeof body.code === 'string' && body.code) return body.code;
  if (typeof body.type === 'string') {
    const slug = body.type.split('/').pop();
    if (slug) return slug.toUpperCase().replace(/-/g, '_');
  }
  return null;
}

/**
 * Map an error thrown by an escrow action to a plain-language message.
 * Detection uses error classes and HTTP status / error codes, never message
 * text, and never returns a raw error string or stack trace.
 */
export function describeSigningError(error: unknown): SigningErrorDescription {
  if (error instanceof WalletRejectedError) {
    return { kind: 'rejected', message: SIGNING_ERROR_MESSAGES.rejected };
  }
  if (error instanceof PollarSigningUnsupportedError) {
    // Its message is a fixed, user-facing string defined in errors.ts.
    return { kind: 'unsupported-wallet', message: error.message };
  }
  if (error instanceof ApiClientError) {
    if (error.status === 410 && apiErrorCode(error.payload) === 'TRANSACTION_EXPIRED') {
      return { kind: 'expired', message: SIGNING_ERROR_MESSAGES.expired };
    }
    if (error.status === 409) {
      return { kind: 'conflict', message: SIGNING_ERROR_MESSAGES.conflict };
    }
  }
  return { kind: 'unknown', message: SIGNING_ERROR_MESSAGES.unknown };
}
