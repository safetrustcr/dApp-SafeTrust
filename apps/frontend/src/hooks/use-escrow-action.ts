import { useState, useCallback, useRef } from 'react';
import { useWallet } from '@/components/auth/wallet/hooks/wallet.hook';
import { getErrorMessages } from '@/lib/trustlesswork-errors';
import { postEscrowApi, EscrowApiError } from '@/lib/api/escrow';

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
        : { route: config.apiRoute, build: crypto.randomUUID(), submit: crypto.randomUUID() };
    attemptRef.current = attempt;

    try {
      const built = await postEscrowApi<{ unsignedXdr?: string }>(
        config.apiRoute,
        config.apiBody,
        { idempotencyKey: attempt.build },
      );
      const { unsignedXdr } = built;
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
