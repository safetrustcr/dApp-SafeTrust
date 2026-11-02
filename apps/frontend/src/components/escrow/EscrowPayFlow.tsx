"use client";

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';

import { useActiveWallet } from '@/hooks/use-active-wallet';
import { useMultiWallet } from '@/components/auth/wallet/hooks/multi-wallet.hook';
import { MainWalletSelectionModal } from '@/components/auth/wallet/components/MainWalletSelectionModal';
import { WalletSelectionModal } from '@/components/auth/wallet/components/WalletSelectionModal';
import { getErrorMessages } from '@/lib/trustlesswork-errors';
import { truncateStellarAddress } from '@/lib/utils';
import { postEscrowApi, getReadiness } from '@/lib/api/escrow';
import { WalletReadinessChecklist } from './WalletReadinessChecklist';

type EscrowPayFlowProps = {
  apartmentId: string;
  apartmentName: string;
  /** Stellar G-address of the apartment owner — receiver role in the escrow. */
  ownerAddress: string;
  amount: number;
  bookingKind?: "apartment" | "hotel-room";
  expectedSenderAddress?: string;
  isReadinessReady?: boolean;
  showChecklist?: boolean;
};

const STELLAR_ADDRESS_RE = /^G[A-Z2-7]{55}$/;

type DeployResponse = {
  contractId: string;
  unsignedXDR: string;
  engagementId: string;
  status: string;
  message?: string;
  cached?: boolean;
};

export function EscrowPayFlow({
  apartmentId,
  apartmentName,
  ownerAddress,
  amount,
  bookingKind = "apartment",
  expectedSenderAddress,
  isReadinessReady,
  showChecklist = true,
}: EscrowPayFlowProps) {
  const router = useRouter();
  const { address, isReady, signAndSubmit } = useActiveWallet();
  const {
    handleConnect,
    isMainModalOpen,
    isStellarModalOpen,
    closeMainModal,
    closeStellarModal,
    handleWalletTypeSelected,
    handleStellarWalletSelected,
    error: walletError,
  } = useMultiWallet();
  const [deploying, setDeploying] = useState(false);
  const [signing, setSigning] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [deployState, setDeployState] = useState<DeployResponse | null>(null);
  const [readinessReady, setReadinessReady] = useState<boolean | null>(null);
  // Synchronous double-click guard — a second click in the same tick is
  // ignored so Trustless Work is only called once per PAY press.
  const deployInFlightRef = useRef(false);
  const signInFlightRef = useRef(false);
  // Reused across retries of the same deploy attempt; cleared on success.
  const deployKeyRef = useRef<string | null>(null);

  const walletMatchesReservation = !expectedSenderAddress || address === expectedSenderAddress;
  const hasOwnerWallet = STELLAR_ADDRESS_RE.test(ownerAddress);
  const payButtonLabel = useMemo(() => {
    if (deploying) return 'Deploying…';
    if (signing) return 'Signing…';
    if (deployState) return 'Sign & Send';
    return 'Create escrow';
  }, [deploying, signing, deployState]);

  const handleDeploy = async () => {
    if (!address) {
      handleConnect();
      return;
    }
    if (!hasOwnerWallet || !walletMatchesReservation) return;
    if (deployInFlightRef.current) return;
    deployInFlightRef.current = true;
    setDeploying(true);
    setDeployState(null);
    setErrorMessages([]);
    try {
      deployKeyRef.current = deployKeyRef.current ?? crypto.randomUUID();
      const payload = await postEscrowApi<DeployResponse>('/api/escrow/deploy', {
        ...(bookingKind === "hotel-room" ? { reservationId: apartmentId } : { apartmentId }),
        senderAddress: address,
      }, { idempotencyKey: deployKeyRef.current });
      deployKeyRef.current = null;
      if (payload.cached && !payload.unsignedXDR) {
        router.push(`/escrow/${apartmentId}/escrow/${encodeURIComponent(payload.engagementId)}${bookingKind === "hotel-room" ? "?kind=hotel-room" : ""}`);
        return;
      }
      setDeployState(payload);
    } catch (error) {
      setErrorMessages(getErrorMessages(error, 'Failed to deploy escrow.'));
    } finally {
      deployInFlightRef.current = false;
      setDeploying(false);
    }
  };

  const handlePayClick = () => {
    if (!isReady) {
      setErrorMessages([]);
      handleConnect();
      return;
    }
    if (deployState) {
      void handleSignAndSend();
    } else {
      void handleDeploy();
    }
  };

  const handleSignAndSend = async () => {
    if (!deployState || !address) return;
    if (signInFlightRef.current) return;
    signInFlightRef.current = true;
    setSigning(true);
    setErrorMessages([]);
    try {
      await signAndSubmit(deployState.unsignedXDR, {
        action: 'initialize',
        // Legacy Freighter/Pollar implementations still accept this typed
        // context. The API intentionally ignores it and uses its pending
        // action record instead, so browser values cannot alter the escrow.
        contractId: deployState.contractId ?? '',
        engagementId: deployState.engagementId,
        senderAddress: address,
        receiverAddress: ownerAddress,
        amount,
        propertyId: apartmentId,
      });
      router.push(`/escrow/${apartmentId}/escrow/${encodeURIComponent(deployState.engagementId)}${bookingKind === "hotel-room" ? "?kind=hotel-room" : ""}`);
    } catch (error) {
      setErrorMessages(getErrorMessages(error, 'Failed to sign escrow.'));
    } finally {
      signInFlightRef.current = false;
      setSigning(false);
    }
  };

  // ── Render: PAY button only — no extra panel, no double error banner ──────
  // The button sits inline in ApartmentPropertyCard's header row.
  // Error messages render below the button, inside the card header area.


  const isReadinessBlocking =
    isReadinessReady !== undefined
      ? !isReadinessReady
      : readinessReady !== null
        ? !readinessReady
        : false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
      <button
        type="button"
        onClick={handlePayClick}
        disabled={deploying || signing || (isReady && (!hasOwnerWallet || !walletMatchesReservation || isReadinessBlocking))}
        style={{
          ...buttonStyle,
          opacity: deploying || signing ? 0.65 : 1,
          cursor: deploying || signing ? 'wait' : 'pointer',
          minWidth: isReady ? '5.5rem' : '10.5rem',
        }}
      >
        {isReady ? payButtonLabel : 'Connect wallet'}
      </button>

      {isReady && !deployState && showChecklist !== false && (
        <div className="w-full min-w-[280px] max-w-sm text-left mt-2">
          <WalletReadinessChecklist
            apartmentId={bookingKind === "hotel-room" ? undefined : apartmentId}
            reservationId={bookingKind === "hotel-room" ? apartmentId : undefined}
            bookingKind={bookingKind}
            onReadyChange={setReadinessReady}
          />
        </div>
      )}

      {isReady && !walletMatchesReservation && <p role="alert" className="max-w-60 text-xs text-orange-600">Switch to the wallet used for this reservation.</p>}
      {isReady && address && <p className="text-xs text-muted-foreground" title={address}>Wallet: {truncateStellarAddress(address)}</p>}
      {isReady && !hasOwnerWallet && <p role="status" className="max-w-60 text-xs text-orange-600">Owner wallet not available. Deployment is disabled.</p>}
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

      {walletError && (
        <p role="alert" style={{ margin: 0, color: '#b91c1c', fontSize: '0.8rem', textAlign: 'left' }}>
          {walletError}
        </p>
      )}

      <MainWalletSelectionModal
        isOpen={isMainModalOpen}
        onClose={closeMainModal}
        onWalletTypeSelected={handleWalletTypeSelected}
        stellarOnly
      />
      <WalletSelectionModal
        isOpen={isStellarModalOpen}
        onClose={closeStellarModal}
        onWalletSelected={handleStellarWalletSelected}
      />
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
