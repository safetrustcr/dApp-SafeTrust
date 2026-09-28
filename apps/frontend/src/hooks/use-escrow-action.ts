import { useState, useCallback, useRef } from 'react';
import { useWallet } from '@/components/auth/wallet/hooks/wallet.hook';
import { getErrorMessages } from '@/lib/trustlesswork-errors';
import { postEscrowApi, EscrowApiError } from '@/lib/api/escrow';

export type EscrowActionPhase = 'building' | 'signing' | 'submitting' | null;

type EscrowActionConfig = {
  apiRoute: string;
  apiBody: Record<string, unknown>;
  sendTransactionBody: Record<string, unknown>;
  /** Called when the API answers 409 so the caller can refetch current status. */
  onConflict?: () => void;
};

type IdempotencyKeys = {
  buildKey: string;
  submitKey: string;
};

/**
 * One `Idempotency-Key` per HTTP phase, generated once per user action and
 * reused when the action is retried. The two phases hit different routes, so
 * they need distinct keys; keeping them stable across retries is what stops a
 * retry from building a second transaction or calling Trustless Work twice.
 */
function actionScope(config: EscrowActionConfig): string {
  const contractId = config.apiBody.contractId ?? config.apiBody.engagementId ?? '';
  return `${config.apiRoute}:${String(contractId)}`;
}

export function useEscrowAction() {
  const { signXDR } = useWallet();
  const [actioning, setActioning] = useState(false);
  const [phase, setPhase] = useState<EscrowActionPhase>(null);
  const [actionError, setActionError] = useState<string[] | null>(null);
  const keysRef = useRef<Map<string, IdempotencyKeys>>(new Map());

  const keysFor = useCallback((config: EscrowActionConfig): IdempotencyKeys => {
    const scope = actionScope(config);
    const existing = keysRef.current.get(scope);
    if (existing) return existing;

    const fresh = { buildKey: crypto.randomUUID(), submitKey: crypto.randomUUID() };
    keysRef.current.set(scope, fresh);
    return fresh;
  }, []);

  const execute = useCallback(async (config: EscrowActionConfig) => {
    setActioning(true);
    setActionError(null);
    setPhase('building');

    const scope = actionScope(config);
    const { buildKey, submitKey } = keysFor(config);

    try {
      const built = await postEscrowApi<{ unsignedXdr?: string }>(
        config.apiRoute,
        config.apiBody,
        buildKey,
      );
      const { unsignedXdr } = built;
      if (!unsignedXdr) throw new Error('No unsigned XDR returned from API');

      setPhase('signing');
      const signedXdr = await signXDR(unsignedXdr);

      setPhase('submitting');
      const result = await postEscrowApi<Record<string, unknown>>(
        '/api/escrow/send-transaction',
        { signedXdr, ...config.sendTransactionBody },
        submitKey,
      );
      console.log('[escrow-action] Transaction confirmed:', result.txHash);
      // The action completed: drop the keys so the next click starts fresh.
      keysRef.current.delete(scope);
      return result;
    } catch (error) {
      if (error instanceof EscrowApiError && error.status === 409) {
        // Someone else already moved the escrow; refetch to show current status.
        config.onConflict?.();
      }
      setActionError(getErrorMessages(error, 'Action failed.'));
      return null;
    } finally {
      setPhase(null);
      setActioning(false);
    }
  }, [signXDR, keysFor]);

  return { execute, actioning, phase, actionError };
}
