"use client";

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { useActiveWallet } from '@/hooks/use-active-wallet';
import { getErrorMessages } from '@/lib/trustlesswork-errors';
import { truncateStellarAddress } from '@/lib/utils';
import { postEscrowApi } from '@/lib/api/escrow';

type EscrowPayFlowProps = {
  apartmentId: string;
  apartmentName: string;
  /** Stellar G-address of the apartment owner — receiver role in the escrow. */
  ownerAddress: string;
  amount: number;
};

const STELLAR_ADDRESS_RE = /^G[A-Z2-7]{55}$/;

type DeployResponse = {
  contractId: string;
  unsignedXDR: string;
  engagementId: string;
  status: string;
  message?: string;
};

export function EscrowPayFlow({
  apartmentId,
  apartmentName,
  ownerAddress,
  amount,
}: EscrowPayFlowProps) {
  const router = useRouter();
  const { address, isReady, signAndSubmit } = useActiveWallet();
  const [deploying, setDeploying] = useState(false);
  const [signing, setSigning] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [deployState, setDeployState] = useState<DeployResponse | null>(null);

  const hasOwnerWallet = STELLAR_ADDRESS_RE.test(ownerAddress);
  const canPay = isReady && hasOwnerWallet;

  const payButtonLabel = useMemo(() => {
    if (deploying) return 'Deploying…';
    if (signing) return 'Signing…';
    if (deployState) return 'Sign & Send';
    return 'PAY';
  }, [deploying, signing, deployState]);

  const handleDeploy = async () => {
    if (!address) {
      setErrorMessages(['Connect your Stellar wallet before paying.']);
      return;
    }
    setDeploying(true);
    setDeployState(null);
    setErrorMessages([]);
    try {
      const payload = await postEscrowApi<DeployResponse>('/api/escrow/deploy', {
        apartmentId,
        senderAddress: address,
        receiverAddress: ownerAddress,
        amount,
      });
      setDeployState(payload);
    } catch (error) {
      setErrorMessages(getErrorMessages(error, 'Failed to deploy escrow.'));
    } finally {
      setDeploying(false);
    }
  };

  const handleSignAndSend = async () => {
    if (!deployState || !address) return;
    setSigning(true);
    setErrorMessages([]);
    try {
      await signAndSubmit(deployState.unsignedXDR, {
        action: 'initialize',
        contractId: deployState.contractId,
        engagementId: deployState.engagementId,
        propertyId: apartmentId,
        senderAddress: address,
        receiverAddress: ownerAddress,
        amount,
      });
      router.push(`/apartment/${apartmentId}/escrow/${deployState.engagementId}`);
    } catch (error) {
      setErrorMessages(getErrorMessages(error, 'Failed to sign escrow.'));
    } finally {
      setSigning(false);
    }
  };

  // ── Render: PAY button only — no extra panel, no double error banner ──────
  // The button sits inline in ApartmentPropertyCard's header row.
  // Error messages render below the button, inside the card header area.

  if (!hasOwnerWallet) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
        <span
          title="Owner wallet not available"
          style={{ display: 'inline-block', cursor: 'not-allowed' }}
        >
          <button
            type="button"
            disabled
            style={{
              ...buttonStyle,
              opacity: 0.45,
              cursor: 'not-allowed',
            }}
          >
            PAY
          </button>
        </span>
        {!isReady && (
          <p role="status" style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280', textAlign: 'right' }}>
            Connect your Stellar wallet to continue.
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
      <button
        type="button"
        onClick={deployState ? handleSignAndSend : handleDeploy}
        disabled={!canPay || deploying || signing}
        style={{
          ...buttonStyle,
          opacity: !canPay || deploying || signing ? 0.65 : 1,
          cursor: deploying || signing ? 'wait' : !canPay ? 'not-allowed' : 'pointer',
          minWidth: '5.5rem',
        }}
      >
        {payButtonLabel}
      </button>

      {!isReady && (
        <p role="status" style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280', textAlign: 'right' }}>
          Connect your Stellar wallet to continue.
        </p>
      )}

      {deployState && (
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280', textAlign: 'right' }}>
          XDR ready ·{' '}
          <span title={deployState.contractId}>
            {truncateStellarAddress(deployState.contractId)}
          </span>
        </p>
      )}

      {errorMessages.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: '1rem', color: '#b91c1c', fontSize: '0.8rem', textAlign: 'left' }}>
          {errorMessages.map((msg, i) => <li key={i}>{msg}</li>)}
        </ul>
      )}
    </div>
  );
}

const buttonStyle = {
  border: '1px solid #f97316',
  backgroundColor: '#f97316',
  color: '#ffffff',
  fontWeight: 700,
  padding: '0.5rem 1.75rem',
  borderRadius: '0.75rem',
  fontSize: '0.95rem',
  letterSpacing: '0.03em',
  lineHeight: 1,
} as const;
