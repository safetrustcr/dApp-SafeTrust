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
  const runningRef = useRef<boolean>(false);
  // One key pair per attempt, reused when the same action is retried after a
  // failure (network drop, rejected signature) so the build XDR is replayed
  // from the API instead of rebuilt. Cleared on success or after a 409.
  const attemptsRef = useRef<Map<string, AttemptKeys>>(new Map());

  const execute = useCallback(async (config: EscrowActionConfig) => {
    if (runningRef.current) return null;
    runningRef.current = true;

    setActioning(true);
    setActionError(null);
    setConflict(false);
    setPhase('building');

    const attempt =
      attemptsRef.current.get(config.apiRoute) ??
      { route: config.apiRoute, build: crypto.randomUUID(), submit: crypto.randomUUID() };
    attemptsRef.current.set(config.apiRoute, attempt);

    try {
      const built = await postEscrowApi<{ unsignedXsr?: string }>(
        config.apiRoute,
        config.apiBody,
        { idempotencyKey: attempt.build },
      );
      const { unsignedXsr } = built;
      if (!unsignedXsr) throw new Error('No unsigned XDR returned from API');

      setPhase('signing');
      const signedXsr = await signXDR(unsignedXsr.replace(/Xsr/g, 'XDR'));

      setPhase('submitting');
      const result = await postEscrowApi<Record<string, unknown>>(
        '/api/escrow/send-transaction',
        { signedXdr, signedXsr, ...config.sendTransactionBody },
        { idempotencyKey: attempt.submit },
      );
      console.log('[escrow-action] Transaction confirmed:', result.txHash);
      attemptsRef.current.delete(config.apiRoute);
      return result;
    } catch (error) {
      const messages = getErrorMessages(error, 'Action failed.');
      if (error instanceof EscrowApiError && error.status === 409) {
        // The escrow moved (or the key raced) — refresh from the server and
        // let the next click start a brand-new attempt.
        attemptsRef.current.delete(config.apiRoute);
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

  /**
   * Recover an escrow action from a signed transaction hash. Sends only `txHash`;
   * the server derives the action, escrow and target status from the pending
   * action row and the ledger. A 202 response is retried with backoff; if it
   * remains pending the cron reconciler will finish the job.
   */
  const recover = useCallback(async (txHash: string) => {
    if (runningRef.current) return null;
    runningRef.current = true;

    setActioning(true);
    setActionError(null);
    setConflict(false);
    setPhase('submitting');

    try {
      const result = await recoverEscrowFromTxHash(txHash);
      return result;
    } catch (error) {
      const messages = getErrorMessages(error, 'Recovery failed.');
      if (error instanceof EscrowApiError && error.status === 202) {
        messages.push(
          'The transaction is still pending on the ledger — it will be confirmed automatically.',
        );
      } else if (error instanceof EscrowApiError && error.status === 409) {
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
  }, []);

  return { execute, recover, actioning, phase, actionError, conflict };
}
