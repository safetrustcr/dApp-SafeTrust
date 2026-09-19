import { useState, useCallback } from 'react';
import { useWallet } from '@/components/auth/wallet/hooks/wallet.hook';
import { getErrorMessages } from '@/lib/trustlesswork-errors';

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
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const targetUrl = config.apiRoute.startsWith('http')
        ? config.apiRoute
        : `${baseUrl}${config.apiRoute}`;

      const apiRes = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config.apiBody),
      });

      if (!apiRes.ok) {
        const payload = await apiRes.json().catch(() => ({}));
        throw getErrorMessages(payload, `API error ${apiRes.status}`);
      }

      const { unsignedXdr } = await apiRes.json();
      if (!unsignedXdr) throw new Error('No unsigned XDR returned from API');

      setPhase('signing');
      const signedXdr = await signXDR(unsignedXdr);

      setPhase('submitting');
      const sendRes = await fetch(`${baseUrl}/api/escrow/send-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedXdr, ...config.sendTransactionBody }),
      });

      if (!sendRes.ok) {
        const payload = await sendRes.json().catch(() => ({}));
        throw getErrorMessages(payload, `Send transaction error ${sendRes.status}`);
      }

      const result = await sendRes.json();
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
