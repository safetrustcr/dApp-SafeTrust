"use client";

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { useWallet } from '@/components/auth/wallet/hooks/wallet.hook';
import { getErrorMessages } from '@/lib/trustlesswork-errors';
import { truncateStellarAddress } from '@/lib/utils';

type EscrowPayFlowProps = {
  apartmentId: string;
  apartmentName: string;
  ownerWalletAddress: string;
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

type SendTransactionResponse = {
  contractId: string;
  engagementId: string;
  escrowId: string;
  status: string;
  transactionHash: string | null;
};

const flowStyles = {
  button: {
    border: '1px solid #f97316',
    backgroundColor: '#f97316',
    color: '#ffffff',
    fontWeight: 700,
    padding: '0.6rem 1.5rem',
    borderRadius: '0.75rem',
  },
  panel: {
    border: '1px solid #fed7aa',
    borderRadius: '1rem',
    backgroundColor: '#ffffff',
    padding: '1rem',
  },
  errorList: {
    margin: 0,
    paddingLeft: '1.25rem',
    color: '#b91c1c',
    fontSize: '0.9rem',
  },
} as const;

export function EscrowPayFlow({
  apartmentId,
  apartmentName,
  ownerWalletAddress,
  amount,
}: EscrowPayFlowProps) {
  const router = useRouter();
  const { address, signXDR } = useWallet();
  const [deploying, setDeploying] = useState(false);
  const [signing, setSigning] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [deployState, setDeployState] = useState<DeployResponse | null>(null);

  const isWalletConnected = Boolean(address);
  const hasOwnerWallet = STELLAR_ADDRESS_RE.test(ownerWalletAddress);
  const canPay = isWalletConnected && hasOwnerWallet;

  const payButtonLabel = useMemo(() => {
    if (deploying) return 'Deploying escrow...';
    if (signing) return 'Awaiting wallet signature...';
    return 'PAY';
  }, [deploying, signing]);

  const handleDeploy = async () => {
    if (!address) {
      setErrorMessages(['Connect your Stellar wallet before deploying escrow.']);
      return;
    }

    if (!hasOwnerWallet) {
      setErrorMessages(['Owner wallet not available — payment is disabled until the owner links a Stellar wallet.']);
      return;
    }

    setDeploying(true);
    setDeployState(null);
    setErrorMessages([]);

    try {
      const response = await fetch('/api/escrow/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apartmentId,
          senderAddress: address,
          receiverAddress: ownerWalletAddress,
          amount,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setErrorMessages(getErrorMessages(payload, 'Failed to deploy escrow.'));
        return;
      }

      setDeployState(payload as DeployResponse);
    } catch (error) {
      setErrorMessages(getErrorMessages(error, 'Failed to deploy escrow.'));
    } finally {
      setDeploying(false);
    }
  };

  const handleSignAndSend = async () => {
    if (!deployState || !address) {
      return;
    }

    setSigning(true);
    setErrorMessages([]);

    try {
      const signedXdr = await signXDR(deployState.unsignedXDR);
      const response = await fetch('/api/escrow/send-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signedXdr,
          action: 'initialize',
          contractId: deployState.contractId,
          engagementId: deployState.engagementId,
          apartmentId,
          senderAddress: address,
          receiverAddress: ownerWalletAddress,
          releaser: process.env.NEXT_PUBLIC_PLATFORM_ADDRESS,
          amount,
        }),
      });

      const payload = (await response.json()) as SendTransactionResponse & { error?: string; messages?: string[] };
      if (!response.ok) {
        setErrorMessages(getErrorMessages(payload, 'Failed to send signed transaction.'));
        return;
      }

      router.push(`/apartment/${apartmentId}/escrow/${payload.engagementId}`);
    } catch (error) {
      setErrorMessages(getErrorMessages(error, 'Failed to complete escrow signing.'));
    } finally {
      setSigning(false);
    }
  };

  return (
    <>
      <span
        style={{ display: 'inline-block', cursor: !canPay ? 'not-allowed' : undefined }}
        title={
          !hasOwnerWallet
            ? 'Owner wallet not available'
            : !isWalletConnected
              ? 'Connect wallet to pay'
              : deployState
                ? 'Sign and submit escrow transaction'
                : `Deploy escrow for ${apartmentName}`
        }
      >
        <button
          type="button"
          onClick={deployState ? handleSignAndSend : handleDeploy}
          disabled={!canPay || deploying || signing}
          style={{
            ...flowStyles.button,
            opacity: !canPay || deploying || signing ? 0.7 : 1,
            cursor: deploying || signing ? 'wait' : !canPay ? 'not-allowed' : 'pointer',
            pointerEvents: !canPay ? 'none' : undefined,
          }}
        >
          {payButtonLabel}
        </button>
      </span>

      <div style={flowStyles.panel}>
        <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Wallet signing</h3>
        {!hasOwnerWallet && (
          <p style={{ margin: 0, color: '#b91c1c', fontSize: '0.9rem' }}>
            Owner wallet not available — payment is disabled until the owner links a Stellar wallet.
          </p>
        )}
        {hasOwnerWallet && !deployState && (
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
            Deploy the escrow first, then Freighter will open so you can sign the XDR.
          </p>
        )}
        {deployState && (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
              Unsigned XDR is ready for engagement <strong>{deployState.engagementId}</strong>.
            </p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#9ca3af' }}>
              Contract ID: <span title={deployState.contractId}>{truncateStellarAddress(deployState.contractId)}</span>
            </p>
          </div>
        )}
        {errorMessages.length > 0 && (
          <ul style={flowStyles.errorList}>
            {errorMessages.map((message, index) => (
              <li key={index}>{message}</li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}