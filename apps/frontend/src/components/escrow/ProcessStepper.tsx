'use client';

import { useQuery } from '@apollo/client';
import { Check } from 'lucide-react';
import type { EscrowDetailStatus } from '@/components/escrow/EscrowDetailLayout';
import { formatDate } from '@/components/escrow/views/escrow-view-utils';
import { GET_ESCROW_TRANSACTIONS } from '@/graphql/queries/escrow-queries';
import { cn } from '@/lib/utils';

export type EscrowTransaction = {
  action: string;
  from_status?: string | null;
  to_status?: string | null;
  tx_hash?: string | null;
  actor_uid?: string | null;
  created_at: string;
  source: string;
};

export type TimelineStep = {
  label: string;
  date: string | null;
  actor: string | null;
  txLink: string | null;
  isConfirmedOnChain: boolean;
  isCurrent: boolean;
  status: string;
  txHash?: string | null;
};

export type ExtendedEscrowStatus =
  | EscrowDetailStatus
  | 'created'
  | 'deploying'
  | 'pending_signature'
  | 'funded'
  | 'active'
  | 'payment_locked'
  | 'payment locked'
  | 'stay_completed'
  | 'stay completed'
  | 'milestone_approved'
  | 'approved'
  | 'completed'
  | 'released'
  | 'disputed'
  | 'resolved'
  | 'cancelled'
  | (string & {});

/**
 * Maps legacy 4-step status values to numeric step indices.
 * @deprecated Kept for backward compatibility. Use the new timeline driven by real escrow_transactions rows instead.
 */
export function statusToStep(status: EscrowDetailStatus): 1 | 2 | 3 | 4 {
  switch (status) {
    case 'pending':
      return 1;
    case 'paid':
      return 2;
    case 'blocked':
      return 3;
    case 'released':
      return 4;
  }
}

/**
 * Reads the network configuration to determine whether to link to Stellar testnet or pubnet explorer.
 */
export function getStellarNetwork(): 'testnet' | 'pubnet' {
  const passphrase = process.env.STELLAR_NETWORK_PASSPHRASE;
  const envNet = process.env.NEXT_PUBLIC_STELLAR_NETWORK;
  if (
    passphrase === 'Public Global Stellar Network ; September 2015' ||
    envNet === 'pubnet' ||
    envNet === 'public' ||
    envNet === 'mainnet'
  ) {
    return 'pubnet';
  }
  return 'testnet';
}

/**
 * Formats a Stellar Expert explorer transaction link for the current network.
 */
export function getExplorerTxUrl(txHash: string | null | undefined): string | null {
  if (!txHash) return null;
  const network = getStellarNetwork();
  return `https://stellar.expert/explorer/${network}/tx/${txHash}`;
}

/**
 * Derives a human-readable actor label from action, source, and actor_uid.
 * source === 'reconciler' always returns 'Confirmed on-chain'.
 */
export function getActorLabel(
  action?: string | null,
  source?: string | null,
  actorUid?: string | null,
): string | null {
  if (source === 'reconciler') {
    return 'Confirmed on-chain';
  }
  if (!action) return null;

  switch (action) {
    case 'mark_milestone_completed':
    case 'reconciler_mark_milestone_completed':
      return 'Host marked the stay completed';
    case 'approve_milestone':
      return 'Guest approved release';
    case 'fund':
      return 'Guest paid deposit';
    case 'initialize':
    case 'create':
      return 'Guest created escrow';
    case 'release_funds':
      return 'Funds released to host';
    case 'dispute':
      return 'Dispute opened';
    case 'resolve_dispute':
      return 'Platform resolved dispute';
    default:
      return actorUid ? `Action ${action} by ${actorUid}` : `Action: ${action}`;
  }
}

/**
 * Formats an ISO date string for display in the timeline.
 */
export function formatStepDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const formatted = formatDate(value);
  return formatted === '—' ? null : formatted;
}

/**
 * Formats a transaction hash into a readable shortened string.
 */
export function formatShortTxHash(txHash: string | null | undefined): string {
  if (!txHash) return '';
  if (txHash.length <= 10) return txHash;
  return `${txHash.slice(0, 4)}…${txHash.slice(-4)}`;
}

/**
 * Maps the status and transactions into ordered TimelineStep objects.
 */
export function mapStatusToTimelineSteps(
  statusInput?: string | null,
  transactions: EscrowTransaction[] = [],
  currentStepInput?: number,
): TimelineStep[] {
  const normalizedStatus = statusInput
    ? statusInput.trim().toLowerCase().replace(/[\s_-]+/g, '_')
    : null;

  const isDispute =
    normalizedStatus === 'disputed' ||
    normalizedStatus === 'resolved' ||
    transactions.some(
      (t) =>
        t.action === 'dispute' ||
        t.action === 'resolve_dispute' ||
        t.to_status === 'disputed' ||
        t.to_status === 'resolved',
    );

  let activeStatus = 'created';
  if (normalizedStatus) {
    if (['pending', 'pending_signature', 'deploying', 'created'].includes(normalizedStatus)) {
      activeStatus = 'created';
    } else if (['paid', 'blocked', 'funded', 'active', 'payment_locked'].includes(normalizedStatus)) {
      activeStatus = 'payment_locked';
    } else if (['stay_completed', 'milestone_completed'].includes(normalizedStatus)) {
      activeStatus = 'stay_completed';
    } else if (['approved', 'milestone_approved'].includes(normalizedStatus)) {
      activeStatus = 'approved';
    } else if (['released', 'completed'].includes(normalizedStatus)) {
      activeStatus = 'released';
    } else if (normalizedStatus === 'disputed') {
      activeStatus = 'disputed';
    } else if (normalizedStatus === 'resolved') {
      activeStatus = 'resolved';
    } else {
      activeStatus = normalizedStatus;
    }
  } else if (typeof currentStepInput === 'number') {
    if (currentStepInput <= 1) activeStatus = 'created';
    else if (currentStepInput === 2) activeStatus = 'payment_locked';
    else if (currentStepInput === 3) activeStatus = 'stay_completed';
    else activeStatus = 'released';
  } else if (transactions.length > 0) {
    if (transactions.some((t) => t.action === 'resolve_dispute' || t.to_status === 'resolved')) {
      activeStatus = 'resolved';
    } else if (transactions.some((t) => t.action === 'dispute' || t.to_status === 'disputed')) {
      activeStatus = 'disputed';
    } else if (
      transactions.some(
        (t) =>
          t.action === 'release_funds' ||
          (t.to_status === 'completed' && t.from_status === 'milestone_approved') ||
          t.to_status === 'released',
      )
    ) {
      activeStatus = 'released';
    } else if (
      transactions.some((t) => t.action === 'approve_milestone' || t.to_status === 'milestone_approved')
    ) {
      activeStatus = 'approved';
    } else if (
      transactions.some(
        (t) =>
          t.action === 'mark_milestone_completed' ||
          t.action === 'reconciler_mark_milestone_completed' ||
          (t.to_status === 'completed' && t.from_status === 'pending'),
      )
    ) {
      activeStatus = 'stay_completed';
    } else if (transactions.some((t) => t.action === 'fund' || t.to_status === 'funded')) {
      activeStatus = 'payment_locked';
    } else {
      activeStatus = 'created';
    }
  }

  type StepTemplate = {
    label: string;
    status: string;
    matcher: (t: EscrowTransaction) => boolean;
  };

  let template: StepTemplate[];

  if (isDispute) {
    template = [
      {
        label: 'Escrow created',
        status: 'created',
        matcher: (t) =>
          t.action === 'initialize' ||
          t.action === 'create' ||
          t.to_status === 'created' ||
          t.to_status === 'pending_signature',
      },
      {
        label: 'Payment locked',
        status: 'payment_locked',
        matcher: (t) => t.action === 'fund' || t.to_status === 'funded' || t.to_status === 'paid',
      },
    ];

    const hasStayCompleted = transactions.some(
      (t) =>
        t.action === 'mark_milestone_completed' ||
        t.action === 'reconciler_mark_milestone_completed' ||
        (t.to_status === 'completed' && t.from_status === 'pending'),
    );
    if (hasStayCompleted) {
      template.push({
        label: 'Stay completed',
        status: 'stay_completed',
        matcher: (t) =>
          t.action === 'mark_milestone_completed' ||
          t.action === 'reconciler_mark_milestone_completed' ||
          (t.to_status === 'completed' && t.from_status === 'pending'),
      });
    }

    template.push(
      {
        label: 'Disputed',
        status: 'disputed',
        matcher: (t) => t.action === 'dispute' || t.to_status === 'disputed',
      },
      {
        label: 'Resolved',
        status: 'resolved',
        matcher: (t) => t.action === 'resolve_dispute' || t.to_status === 'resolved',
      },
    );
  } else {
    template = [
      {
        label: 'Escrow created',
        status: 'created',
        matcher: (t) =>
          t.action === 'initialize' ||
          t.action === 'create' ||
          t.to_status === 'created' ||
          t.to_status === 'pending_signature',
      },
      {
        label: 'Payment locked',
        status: 'payment_locked',
        matcher: (t) =>
          t.action === 'fund' ||
          t.to_status === 'funded' ||
          t.to_status === 'paid' ||
          t.to_status === 'blocked',
      },
      {
        label: 'Stay completed',
        status: 'stay_completed',
        matcher: (t) =>
          t.action === 'mark_milestone_completed' ||
          t.action === 'reconciler_mark_milestone_completed' ||
          (t.to_status === 'completed' && t.from_status === 'pending'),
      },
      {
        label: 'Approved',
        status: 'approved',
        matcher: (t) =>
          t.action === 'approve_milestone' ||
          t.to_status === 'milestone_approved' ||
          t.to_status === 'approved',
      },
      {
        label: 'Released',
        status: 'released',
        matcher: (t) =>
          t.action === 'release_funds' ||
          (t.to_status === 'completed' &&
            (t.from_status === 'milestone_approved' || t.from_status === 'approved')) ||
          t.to_status === 'released',
      },
    ];
  }

  let currentIndex = template.findIndex((s) => s.status === activeStatus);
  if (currentIndex === -1) currentIndex = 0;

  return template.map((stepDef, index) => {
    const isCurrent = index === currentIndex;
    const tx = transactions.find(stepDef.matcher);

    return {
      label: stepDef.label,
      status: stepDef.status,
      isCurrent,
      date: tx ? formatStepDate(tx.created_at) : null,
      actor: tx ? getActorLabel(tx.action, tx.source, tx.actor_uid) : null,
      txLink: tx?.tx_hash ? getExplorerTxUrl(tx.tx_hash) : null,
      isConfirmedOnChain: tx?.source === 'reconciler',
      txHash: tx?.tx_hash ?? null,
    };
  });
}

export type ProcessStepperProps = {
  currentStep?: 1 | 2 | 3 | 4 | number;
  status?: ExtendedEscrowStatus;
  engagementId?: string;
  transactions?: EscrowTransaction[];
};

export function ProcessStepper({
  currentStep,
  status,
  engagementId,
  transactions: propTransactions,
}: ProcessStepperProps) {
  const { data } = useQuery<{ escrow_transactions: EscrowTransaction[] }>(
    GET_ESCROW_TRANSACTIONS,
    {
      variables: { engagement_id: engagementId },
      skip: !engagementId || !!propTransactions,
    },
  );

  const transactions = propTransactions ?? data?.escrow_transactions ?? [];
  const steps = mapStatusToTimelineSteps(status, transactions, currentStep);
  const currentIndex = steps.findIndex((s) => s.isCurrent);

  return (
    <div className="border-t border-border pt-5">
      <h3 className="mt-0 mb-4 text-sm font-semibold text-foreground">Process</h3>
      <ol className="grid gap-1 list-none p-0 m-0">
        {steps.map((step, index) => {
          const isCompleted = currentIndex !== -1 && index < currentIndex;
          const isCurrent = step.isCurrent;
          const isLast = index === steps.length - 1;
          const showDetails = (isCompleted || isCurrent) && (step.date || step.actor || step.txLink);
          const shortHash = formatShortTxHash(step.txHash ?? step.txLink?.split('/tx/')[1] ?? '');

          return (
            <li
              key={step.status}
              aria-current={isCurrent ? 'step' : undefined}
              className="flex gap-3.5"
            >
              {/* Marker column with connector line */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
                    isCurrent
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-1'
                      : isCompleted
                        ? 'bg-success text-success-foreground'
                        : 'bg-muted text-muted-foreground border border-border',
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden />
                  ) : (
                    <span className="text-xs font-semibold">{index + 1}</span>
                  )}
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      'w-0.5 flex-grow min-h-6 my-1',
                      isCompleted ? 'bg-success' : 'bg-border',
                    )}
                    aria-hidden
                  />
                )}
              </div>

              {/* Step text */}
              <div className={cn('pb-4 text-sm', isLast && 'pb-0')}>
                <p
                  className={cn(
                    'm-0 leading-tight',
                    isCurrent
                      ? 'font-bold text-foreground'
                      : isCompleted
                        ? 'font-medium text-foreground'
                        : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </p>

                {showDetails && (
                  <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    {step.date && <p className="m-0">{step.date}</p>}
                    {step.actor && <p className="m-0 font-medium">{step.actor}</p>}
                    {step.txLink && (
                      <p className="m-0">
                        <a
                          href={step.txLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono underline text-primary hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm"
                        >
                          {shortHash || 'View transaction'}
                        </a>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
