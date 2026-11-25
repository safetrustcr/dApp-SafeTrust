"use client";

import { useEffect, useRef, type CSSProperties } from 'react';
import { AlertCircle, CheckCircle2, Loader2, RotateCcw, Wallet, type LucideIcon } from 'lucide-react';

import type { EscrowActionStatus } from '@/hooks/use-escrow-action';
import { describeSigningError } from '@/lib/wallet/signing-error';
import { signingButtonStyle, signingColors } from './signing-styles';

export type WalletSigningStatusProps = {
  /** Lifecycle of the current attempt, from useEscrowAction().status. */
  phase: EscrowActionStatus;
  /** What is happening, in the user's words, e.g. "Releasing funds". */
  action: string;
  /** Raw error of the failed attempt, from useEscrowAction().error. */
  error?: unknown;
  /** Repeat the attempt; useEscrowAction().retry reuses its idempotency keys. */
  onRetry: () => void;
};

type StateView = {
  label: string;
  hint: string;
  icon: LucideIcon;
  color: string;
  spin?: boolean;
  /** 1-based position in the Preparing → Confirm → Submitting sequence. */
  step?: 1 | 2 | 3;
};

const IN_PROGRESS: Record<'building' | 'signing' | 'submitting', StateView> = {
  building: {
    label: 'Preparing…',
    hint: 'Getting the transaction ready.',
    icon: Loader2,
    color: signingColors.muted,
    spin: true,
    step: 1,
  },
  signing: {
    label: 'Confirm in your wallet',
    hint: 'Approve the transaction in your wallet to continue.',
    icon: Wallet,
    color: signingColors.accent,
    step: 2,
  },
  submitting: {
    label: 'Submitting…',
    hint: 'Sending the signed transaction to the network.',
    icon: Loader2,
    color: signingColors.muted,
    spin: true,
    step: 3,
  },
};

const TOTAL_STEPS = 3;

function stateView(phase: Exclude<EscrowActionStatus, 'idle'>, error: unknown): StateView {
  if (phase === 'done') {
    return {
      label: 'Done',
      hint: 'The transaction went through.',
      icon: CheckCircle2,
      color: signingColors.success,
    };
  }
  if (phase === 'failed') {
    return {
      label: 'Failed',
      hint: describeSigningError(error).message,
      icon: AlertCircle,
      color: signingColors.error,
    };
  }
  return IN_PROGRESS[phase];
}

/**
 * One progress indicator for every escrow action:
 * Preparing → Confirm in your wallet → Submitting → Done, or Failed with a
 * plain-language reason and a retry button that receives focus.
 */
export function WalletSigningStatus({ phase, action, error, onRetry }: WalletSigningStatusProps) {
  const retryRef = useRef<HTMLButtonElement>(null);
  const failed = phase === 'failed';

  // Focus retry each time an attempt fails. A retry passes through
  // building/signing first, so a second failure re-runs this effect; a parent
  // re-rendering with an equal-but-new error object does not steal focus.
  useEffect(() => {
    if (failed) retryRef.current?.focus();
  }, [failed]);

  if (phase === 'idle') return null;

  const view = stateView(phase, error);
  const Icon = view.icon;

  return (
    <div style={styles.container}>
      <div role="status" aria-live="polite" aria-atomic="true" style={styles.row}>
        <Icon
          aria-hidden="true"
          size={18}
          color={view.color}
          className={view.spin ? 'animate-spin motion-reduce:animate-none' : undefined}
          style={{ flexShrink: 0, marginTop: '0.05rem' }}
        />
        <div style={{ minWidth: 0 }}>
          <p style={styles.title}>
            {action}: <span style={{ color: view.color }}>{view.label}</span>
          </p>
          <p style={{ ...styles.hint, color: failed ? signingColors.error : signingColors.muted }}>
            {view.hint}
            {view.step && ` Step ${view.step} of ${TOTAL_STEPS}.`}
          </p>
        </div>
      </div>

      {failed && (
        <button ref={retryRef} type="button" onClick={onRetry} style={styles.retry}>
          <RotateCcw aria-hidden="true" size={14} />
          Try again
        </button>
      )}
    </div>
  );
}

const styles = {
  container: {
    marginTop: '1rem',
    padding: '0.75rem 1rem',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '0.75rem',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
  },
  row: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.6rem',
    flex: '1 1 14rem',
  },
  title: {
    margin: 0,
    fontSize: '0.85rem',
    fontWeight: 700,
    color: '#202124',
  },
  hint: {
    margin: '0.2rem 0 0',
    fontSize: '0.75rem',
    lineHeight: 1.4,
  },
  retry: {
    ...signingButtonStyle,
    padding: '0.5rem 1.1rem',
    fontSize: '0.85rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    cursor: 'pointer',
  },
} as const satisfies Record<string, CSSProperties>;
