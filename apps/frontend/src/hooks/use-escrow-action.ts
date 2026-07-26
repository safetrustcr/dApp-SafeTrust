import { useState } from 'react';
import { useWallet } from '@/components/auth/wallet/hooks/wallet.hook';
import { getErrorMessages } from '@/lib/trustlesswork-errors';

type EscrowActionConfig = {
  apiRoute: string;
  apiBody: Record<string, unknown>;
  sendTransactionBody: Record<string, unknown>;
};

export function useEscrowAction() {
  const { signXDR } = useWallet();
  const [actioning, setActioning] = useState(false);
  const [actionError, setActionError] = useState<string[] | null>(null);

  async function execute(config: EscrowActionConfig) {
    setActioning(true);
    setActionError(null);

    try {
      const apiRes = await fetch(config.apiRoute, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config.apiBody),
      });

      if (!apiRes.ok) {
        const err = await apiRes.json().catch(() => ({}));
        throw new Error(err.error ?? `API error ${apiRes.status}`);
      }

      const { unsignedXdr } = await apiRes.json();
      if (!unsignedXdr) throw new Error('No unsigned XDR returned from API');

      const signedXdr = await signXDR(unsignedXdr);

      const sendRes = await fetch('/api/escrow/send-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedXdr, ...config.sendTransactionBody }),
      });

      if (!sendRes.ok) {
        const err = await sendRes.json().catch(() => ({}));
        throw new Error(err.error ?? `Send transaction error ${sendRes.status}`);
      }

      const result = await sendRes.json();
      console.log('[escrow-action] Transaction confirmed:', result);
    } catch (error) {
      setActionError(getErrorMessages(error, 'Action failed.'));
    } finally {
      setActioning(false);
    }
  }

  return { execute, actioning, actionError };
}
