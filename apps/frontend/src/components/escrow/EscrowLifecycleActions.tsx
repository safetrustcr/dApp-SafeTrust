"use client";

import { useState, type CSSProperties, type ReactNode } from 'react';

import { useWallet } from '@/components/auth/wallet/hooks/wallet.hook';
import { getErrorMessages } from '@/lib/trustlesswork-errors';

type EscrowLifecycleActionsProps = {
  contractId: string;
  engagementId: string;
  amount: number;
  status: string;
  senderAddress?: string | null;
  receiverAddress?: string | null;
};

type PrepareResponse = { unsignedXDR: string; message?: string };

type ActionKind = 'milestone-status' | 'release-funds' | 'resolve-dispute';

const ACTION_ENDPOINT: Record<ActionKind, string> = {
  'milestone-status': '/api/escrow/milestone-status',
  'release-funds': '/api/escrow/release-funds',
  'resolve-dispute': '/api/escrow/resolve-dispute',
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
    display: 'grid',
    gap: '0.5rem',
  },
  input: {
    display: 'block',
    width: '100%',
    marginTop: '0.25rem',
    border: '1px solid #d8d8d8',
    borderRadius: '0.35rem',
    padding: '0.5rem 0.6rem',
    font: 'inherit',
  },
  errorList: {
    margin: 0,
    paddingLeft: '1.25rem',
    color: '#b91c1c',
    fontSize: '0.9rem',
  },
} as const satisfies Record<string, CSSProperties>;

function ActionPanel({
  title,
  description,
  busy,
  preparing,
  signing,
  ready,
  onPrepare,
  onSign,
  idleLabel,
}: {
  title: string;
  description: string;
  busy: boolean;
  preparing: boolean;
  signing: boolean;
  ready: boolean;
  onPrepare: () => void;
  onSign: () => void;
  idleLabel: string;
}) {
  const label = signing
    ? 'Awaiting wallet signature...'
    : preparing
      ? 'Preparing transaction...'
      : ready
        ? 'Sign & Submit'
        : idleLabel;

  return (
    <div style={flowStyles.panel}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      <p style={{ margin: 0, color: '#6b7280', fontSize: '0.85rem' }}>{description}</p>
      <button
        type="button"
        onClick={ready ? onSign : onPrepare}
        disabled={busy}
        style={{ ...flowStyles.button, opacity: busy ? 0.7 : 1, cursor: busy ? 'wait' : 'pointer', justifySelf: 'start' }}
      >
        {label}
      </button>
    </div>
  );
}

export function EscrowLifecycleActions({
  contractId,
  engagementId,
  amount,
  status,
  senderAddress,
  receiverAddress,
}: EscrowLifecycleActionsProps) {
  const { address, signXDR } = useWallet();
  const [preparing, setPreparing] = useState(false);
  const [signing, setSigning] = useState(false);
  const [unsignedXDR, setUnsignedXDR] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<ActionKind | null>(null);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [approverFunds, setApproverFunds] = useState(0);
  const [receiverFunds, setReceiverFunds] = useState(amount);

  const platformAddress = process.env.NEXT_PUBLIC_PLATFORM_ADDRESS;
  const isOwner = Boolean(address) && address === receiverAddress;
  const isPlatform = Boolean(address) && Boolean(platformAddress) && address === platformAddress;
  const busy = preparing || signing;

  const prepare = async (action: ActionKind, body: Record<string, unknown>) => {
    setPreparing(true);
    setErrorMessages([]);
    setUnsignedXDR(null);
    setPendingAction(null);

    try {
      const response = await fetch(ACTION_ENDPOINT[action], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const payload = await response.json();
      if (!response.ok) {
        setErrorMessages(getErrorMessages(payload, 'Failed to prepare transaction.'));
        return;
      }

      setPendingAction(action);
      setUnsignedXDR((payload as PrepareResponse).unsignedXDR);
    } catch (error) {
      setErrorMessages(getErrorMessages(error, 'Failed to prepare transaction.'));
    } finally {
      setPreparing(false);
    }
  };

  const handleSignAndSend = async () => {
    if (!unsignedXDR || !pendingAction || !address) return;

    setSigning(true);
    setErrorMessages([]);

    try {
      const signedXdr = await signXDR(unsignedXDR);
      const response = await fetch('/api/escrow/send-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedXdr, action: pendingAction, contractId, engagementId }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setErrorMessages(getErrorMessages(payload, 'Failed to send signed transaction.'));
        return;
      }

      setUnsignedXDR(null);
      setPendingAction(null);
    } catch (error) {
      setErrorMessages(getErrorMessages(error, 'Failed to complete escrow signing.'));
    } finally {
      setSigning(false);
    }
  };

  const handleMarkMilestoneComplete = () =>
    prepare('milestone-status', {
      contractId,
      milestoneIndex: 0,
      newEvidence: 'Milestone completed.',
      newStatus: 'approved',
      serviceProvider: receiverAddress,
    });

  const handleReleaseFunds = () => prepare('release-funds', { contractId, releaseSigner: platformAddress });

  const handleResolveDispute = () =>
    prepare('resolve-dispute', { contractId, approverFunds, receiverFunds, releaseSigner: platformAddress });

  let content: ReactNode = null;

  if (status === 'funded' && isOwner) {
    content = (
      <ActionPanel
        title="Mark Milestone Complete"
        description="Confirm the rental conditions were met so the deposit can move toward release."
        busy={busy}
        preparing={preparing}
        signing={signing}
        ready={pendingAction === 'milestone-status' && Boolean(unsignedXDR)}
        onPrepare={handleMarkMilestoneComplete}
        onSign={handleSignAndSend}
        idleLabel="Mark Milestone Complete"
      />
    );
  } else if (status === 'active' && isPlatform) {
    content = (
      <ActionPanel
        title="Release Funds"
        description="Release the held deposit to the beneficiary wallet."
        busy={busy}
        preparing={preparing}
        signing={signing}
        ready={pendingAction === 'release-funds' && Boolean(unsignedXDR)}
        onPrepare={handleReleaseFunds}
        onSign={handleSignAndSend}
        idleLabel="Release Funds"
      />
    );
  } else if (status === 'disputed' && isPlatform) {
    const ready = pendingAction === 'resolve-dispute' && Boolean(unsignedXDR);
    const label = signing
      ? 'Awaiting wallet signature...'
      : preparing
        ? 'Preparing resolution...'
        : ready
          ? 'Sign & Submit'
          : 'Resolve Dispute';

    content = (
      <div style={flowStyles.panel}>
        <h3 style={{ margin: 0 }}>Resolve Dispute</h3>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.85rem' }}>
          Split the deposit between the tenant (approver) and the owner (receiver).
        </p>
        <label style={{ fontSize: '0.85rem', color: '#374151' }}>
          Approver funds
          <input
            type="number"
            min={0}
            value={approverFunds}
            onChange={(event) => setApproverFunds(Number(event.target.value))}
            style={flowStyles.input}
          />
        </label>
        <label style={{ fontSize: '0.85rem', color: '#374151' }}>
          Receiver funds
          <input
            type="number"
            min={0}
            value={receiverFunds}
            onChange={(event) => setReceiverFunds(Number(event.target.value))}
            style={flowStyles.input}
          />
        </label>
        <button
          type="button"
          onClick={ready ? handleSignAndSend : handleResolveDispute}
          disabled={busy}
          style={{ ...flowStyles.button, opacity: busy ? 0.7 : 1, cursor: busy ? 'wait' : 'pointer', justifySelf: 'start' }}
        >
          {label}
        </button>
      </div>
    );
  }

  if (!content) {
    return null;
  }

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      {content}
      {errorMessages.length > 0 && (
        <ul style={flowStyles.errorList}>
          {errorMessages.map((message, index) => (
            <li key={index}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
