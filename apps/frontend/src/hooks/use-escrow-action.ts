import { useState, useCallback } from 'react';
import { useWallet } from '@/components/auth/wallet/hooks/wallet.hook';
import { getErrorMessages } from '@/lib/trustlesswork-errors';
import { postEscrowApi } from '@/lib/api/escrow';

export type EscrowActionPhase = 'building' | 'signing' | 'submitting' | null;

type EscrowActionConfig = {
  apiRoute: string;
  apiBody: Record<string, unknown>;
  sendTransactionBody: Record<string, unknown>;
};

export function useEscrowAction() {
  const { signXDR } = useWallet();
  const [actioning, setActioning] = useState(false);
  const [phase, setPhase] = useState<EscrowActionPhase>(null);
  const [actionError, setActionError] = useState<string[] | null>(null);

  const execute = useCallback(async (config: EscrowActionConfig) => {
    setActioning(true);
    setActionError(null);
    setPhase('building');

    try {
      const built = await postEscrowApi<{ unsignedXdr?: string }>(
        config.apiRoute,
        config.apiBody,
      );
      const { unsignedXdr } = built;
      if (!unsignedXdr) throw new Error('No unsigned XDR returned from API');

      setPhase('signing');
      const signedXdr = await signXDR(unsignedXdr);

      setPhase('submitting');
      const result = await postEscrowApi<Record<string, unknown>>(
        '/api/escrow/send-transaction',
        { signedXdr, ...config.sendTransactionBody },
      );
      console.log('[escrow-action] Transaction confirmed:', result.txHash);
      return result;
    } catch (error) {
      setActionError(getErrorMessages(error, 'Action failed.'));
      return null;
    } finally {
      setPhase(null);
      setActioning(false);
    }
  }, [signXDR]);

  return { execute, actioning, phase, actionError };
}
