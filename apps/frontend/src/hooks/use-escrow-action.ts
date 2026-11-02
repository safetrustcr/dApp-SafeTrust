import { useState, useCallback, useRef } from 'react';
import { useWallet } from '@/components/auth/wallet/hooks/wallet.hook';
import { getErrorMessages } from '@/lib/trustlesswork-errors';
import { postEscrowApi, EscrowApiError, recoverEscrowFromTxHash } from '@/lib/api/escrow';

export type EscrowActionPhase = 'building' | 'signing' | 'submitting' | null;

type EscrowActionConfig = {
  apiRoute: string;
  apiBody: Record<string, unknown>;
  sendTransactionBody: Record<string, unknown>;
};

type AttemptKeys = {
  route: string;
  /** Idempotency-Key for the XDR build call. */
  build: string;
  /** Idempotency-Key for the matching send-transaction submit. */
  submit: string;
};

export function useEscrowAction() {
  const { signXDR } = useWallet();
  const [actioning, setActioning] = useState(false);
  const [phase, setPhase] = useState<EscrowActionPhase>(null);
  const [actionError, setActionError] = useState<string[] | null>(null);
  const [conflict, setConflict] = useState(false);

  // Synchronous double-click guard: a second click while one attempt is in
  // flight is ignored, so Trustless Work is called at most once per click storm.
  const runningRef = useRef(false);
  // One key pair per attempt, reused when the same action is retried after a
  // failure (network drop, rejected signature) so the build XDR is replayed
  // from the API instead of rebuilt. Cleared on success or after a 409.
  const attemptRef = useRef<AttemptKeys | null>(null);

  const execute = useCallback(async (config: EscrowActionConfig) => {
    if (runningRef.current) return null;
    runningRef.current = true;

    setActioning(true);
    setActionError(null);
    setConflict(false);
    setPhase('building');

    const attempt =
      attemptRef.current && attemptRef.current.route === config.apiRoute
        ? attemptRef.current
        : { route: config.apiRoute, build: crypto.randomUUID(), submit: crypto.randomUUID()};
    attemptRef.current = attempt;

    try {
      const built = await postEscrowApi<{ unsignedXdr?: string }>(
        config.apiRoute,
        config.apiBody,
        { idempotencyKey: attempt.build },
      );
      const unsignedXdr = built.unsignedXdr;
      if (!unsignedXdr) throw new Error('No unsigned XDR returned from API');

      setPhase('signing');
      const signedXdr = await signXDR(unsignedXdr);

      setPhase('submitting');
      const result = await postEscrowApi<Record<string, unknown>>(
        '/api/escrow/send-transaction',
        { signedXdr, ...config.sendTransactionBody },
        { idempotencyKey: attempt.submit },
      );
      console.log('[escrow-action] Transaction confirmed:', result.txHash);
      attemptRef.current = null;
      return result;
    } catch (error) {
      // If the submit failed after signing (e.g. the browser closed or the
      // network dropped), the transaction may still be on the ledger. Recover
      // it from the tx hash so the escrow moves forward. The server derives
      // everything from the pending action; we only send the hash.
      const txHash = extractTxHash(error);
      if (txHash) {
        const recovered = await recoverWithBackoff(txHash);
        if (recovered) {
          attemptRef.current = null;
          return recovered;
        }
      }
      const messages = getErrorMessages(error, 'Action failed.');
      if (error instanceof EscrowApiError && error.status === 409) {
        // The escrow moved (or the key raced) — refresh from the server and
        // let the next click start a brand-new attempt.
        attemptRef.current = null;
        messages.push('The escrow state changed — showing the latest status.');
        setConflict(true);
      }
      setActionError(messages);
      return null;
    } finally {
      runningRef.current = false;
      setPhase(null);
      setActioning(false);
    }
  }, [signXDR]);

  return { execute, actioning, phase, actionError, conflict };
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
 * transaction never lands within the retry budget.
 */
async function recoverWithBackoff(
  txHash: string,
): Promise<Record<string, unknown> | null> {
  const delays = [1000, 2000, 4000, 8000];
  for (let i = 0; i <= delays.length; i++) {
    try {
      return await recoverEscrowFromTxHash(txHash);
    } catch (error) {
      if (error instanceof EscrowApiError && error.status === 202) {
        if (i < delays.length) {
          await new Promise((resolve) => setTimeout(resolve, delays[i]));
          continue;
        }
        return null;
      }
      throw error;
    }
  }
  return null;
}
