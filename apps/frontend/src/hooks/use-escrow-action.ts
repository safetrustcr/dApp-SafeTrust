import { useState, useCallback, useRef } from 'react';
import { useWallet } from '@/components/auth/wallet/hooks/wallet.hook';
import { getErrorMessages } from '@/lib/trustlesswork-errors';
import { postEscrowApi, EscrowApiError, recoverEscrowFromTxHash } from '@/lib/api/escrow';
import { Transaction, TransactionBuilder } from '@stellar/stellar-sdk';

export type EscrowActionPhase = 'building' | 'signing' | 'submitting' | null;

/** Full lifecycle of the latest attempt, for WalletSigningStatus. */
export type EscrowActionStatus = 'idle' | 'building' | 'signing' | 'submitting' | 'done' | 'failed';

export type EscrowActionConfig = {
  apiRoute: string;
  apiBody: Record<string, unknown>;
  sendTransactionBody: Record<string, unknown>;
};

type AttemptKeys = {
  route: string;
  /** Serialized apiBody, so changed inputs (e.g. a new dispute split) start a new attempt. */
  body: string;
  /** Idempotency-Key for the XDR build call. */
  build: string;
  /** Idempotency-Key for the matching send-transaction submit. */
  submit: string;
  /**
   * Unsigned XDR returned by the build call. A retry signs this again instead
   * of calling the build route, so a cancelled signature never triggers a
   * second build request (or a second Trustless Work build).
   */
  built?: { unsignedXdr: string; networkPassphrase?: string };
};

export function useEscrowAction() {
  const { signXDR } = useWallet();
  const [actioning, setActioning] = useState(false);
  const [phase, setPhase] = useState<EscrowActionPhase>(null);
  const [outcome, setOutcome] = useState<'done' | 'failed' | null>(null);
  const [actionError, setActionError] = useState<string[] | null>(null);
  // The raw error of the last failed attempt, so the UI can map it to a
  // plain-language message by type and status instead of showing its text.
  const [error, setError] = useState<unknown>(null);
  const [conflict, setConflict] = useState(false);

  // Synchronous double-click guard: a second click while one attempt is in
  // flight is ignored, so Trustless Work is called at most once per click storm.
  const runningRef = useRef(false);
  // One key pair per attempt, reused when the same action is retried after a
  // failure (network drop, rejected signature) so the build XDR is replayed
  // instead of rebuilt. Cleared on success, after a 409, or after a 410
  // (an expired transaction can't be signed again — it must be rebuilt).
  const attemptRef = useRef<AttemptKeys | null>(null);
  // The last action run, so retry() repeats exactly the same request.
  const lastConfigRef = useRef<EscrowActionConfig | null>(null);

  const execute = useCallback(async (config: EscrowActionConfig) => {
    if (runningRef.current) return null;
    runningRef.current = true;
    lastConfigRef.current = config;

    setActioning(true);
    setActionError(null);
    setError(null);
    setConflict(false);
    setOutcome(null);

    const body = JSON.stringify(config.apiBody);
    const previous = attemptRef.current;
    const attempt: AttemptKeys =
      previous && previous.route === config.apiRoute && previous.body === body
        ? previous
        : { route: config.apiRoute, body, build: crypto.randomUUID(), submit: crypto.randomUUID() };
    attemptRef.current = attempt;
    setPhase(attempt.built ? 'signing' : 'building');

    // Hash of the signed XDR, computed client-side as soon as we have it, so
    // recovery works even when the submit response never arrives.
    let localTxHash: string | null = null;
    let succeeded = false;

    try {
      let built = attempt.built;
      if (!built) {
        const response = await postEscrowApi<{ unsignedXdr?: string; networkPassphrase?: string }>(
          config.apiRoute,
          config.apiBody,
          { idempotencyKey: attempt.build },
        );
        if (!response.unsignedXdr) throw new Error('No unsigned XDR returned from API');
        built = { unsignedXdr: response.unsignedXdr, networkPassphrase: response.networkPassphrase };
        attempt.built = built;
      }

      setPhase('signing');
      const signedXdr = await signXDR(built.unsignedXdr, built.networkPassphrase);
      localTxHash = computeTxHash(signedXdr, built.networkPassphrase);

      setPhase('submitting');
      const result = await postEscrowApi<Record<string, unknown>>(
        '/api/escrow/send-transaction',
        { signedXdr, ...config.sendTransactionBody },
        { idempotencyKey: attempt.submit },
      );
      console.log('[escrow-action] Transaction confirmed:', result.txHash);
      attemptRef.current = null;
      succeeded = true;
      return result;
    } catch (caught) {
      // If the submit failed after signing (e.g. the browser closed or the
      // network dropped), the transaction may still be on the ledger. Recover
      // it from the tx hash so the escrow moves forward. The server derives
      // everything from the pending action; we only send the hash.
      const txHash = extractTxHash(caught) ?? localTxHash;
      if (txHash) {
        // A failed recovery must not hide the original error from the user.
        const recovered = await recoverWithBackoff(txHash).catch(() => null);
        if (recovered) {
          attemptRef.current = null;
          succeeded = true;
          return recovered;
        }
      }
      console.error('[escrow-action] Action failed:', caught);
      const messages = getErrorMessages(caught, 'Action failed.');
      if (caught instanceof EscrowApiError && caught.status === 409) {
        // The escrow moved (or the key raced) — refresh from the server and
        // let the next click start a brand-new attempt.
        attemptRef.current = null;
        messages.push('The escrow state changed — showing the latest status.');
        setConflict(true);
      } else if (caught instanceof EscrowApiError && caught.status === 410) {
        // TRANSACTION_EXPIRED: the stored XDR is past its time bounds. Reusing
        // the build key would replay that same expired XDR, so the retry has
        // to build a new transaction with fresh keys.
        attemptRef.current = null;
      }
      setError(caught);
      setActionError(messages);
      return null;
    } finally {
      runningRef.current = false;
      setPhase(null);
      setActioning(false);
      setOutcome(succeeded ? 'done' : 'failed');
    }
  }, [signXDR]);

  /** Repeat the last action with the same attempt keys (and cached XDR). */
  const retry = useCallback(async () => {
    const config = lastConfigRef.current;
    return config ? execute(config) : null;
  }, [execute]);

  const status: EscrowActionStatus = phase ?? outcome ?? 'idle';

  return { execute, retry, actioning, phase, status, actionError, error, conflict };
}

/**
 * Compute the 64-hex transaction hash from a signed XDR. The hash excludes
 * signatures, so it matches the hash the API recorded for the unsigned XDR.
 */
function computeTxHash(signedXdr: string, networkPassphrase?: string): string | null {
  try {
    const tx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase ?? '') as Transaction;
    return Array.from(tx.hash(), (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

/**
 * Pull a 64-hex transaction hash out of a submit error, if present. The
 * send-transaction endpoint includes the hash when the transaction was
 * broadcast but confirmation failed.
 */
function extractTxHash(error: unknown): string | null {
  if (!(error instanceof EscrowApiError)) return null;
  const body = error.payload as Record<string, unknown> | undefined;
  const candidate = body?.txHash ?? body?.hash;
  return typeof candidate === 'string' && /^[0-9a-f]{64}$/i.test(candidate)
    ? candidate
    : null;
}

/**
 * Retry recovery with exponential backoff while the ledger reports the
 * transaction as pending (202). Returns the recovered result, or null if the
 * transaction never lands within the retry budget. A result that is still
 * `{ pending: true }` is not confirmed, so it counts as not recovered.
 */
async function recoverWithBackoff(
  txHash: string,
): Promise<Record<string, unknown> | null> {
  const delays = [1000, 2000, 4000, 8000];
  for (let i = 0; i <= delays.length; i++) {
    try {
      const recovered = await recoverEscrowFromTxHash(txHash);
      return recovered.pending ? null : recovered;
    } catch (error) {
      if (error instanceof EscrowApiError && error.status === 202) {
        if (i < delays.length) {
          await new Promise((resolve) => setTimeout(resolve, delays[i]));
          continue;
        }
        return null;
      }
      if (error instanceof EscrowApiError && error.status === 404) return null;
      throw error;
    }
  }
  return null;
}