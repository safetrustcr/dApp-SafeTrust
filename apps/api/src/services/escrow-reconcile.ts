import { hasuraRequest } from './hasura.js';
import { confirmTransaction } from './stellar-confirm.js';
import { mapTrustlessWorkStatus } from '../lib/trustless-work-status.js';
import {
  prepareEscrowLifecycleMessage,
  lifecycleMessageInput,
  messageMutationFields,
  messageMutationVariable,
} from './conversation-events.js';

export type ReconcileSummary = {
  confirmed: number;
  failed: number;
  expired: number;
  corrected: number;
  errors: number;
};

type PendingActionRow = {
  id: string;
  action: string;
  contract_id?: string | null;
  engagement_id?: string | null;
  tx_hash?: string | null;
  created_at?: string | null;
};

type EscrowRow = {
  id: string;
  contract_id?: string | null;
  engagement_id?: string | null;
  status?: string | null;
  amount?: string | number | null;
  trustless_work_escrows?: { status?: string | null }[];
};

const TRANSITION_MAP: Record<string, string> = {
  fund: 'funded',
  initialize: 'created',
  mark_milestone_completed: 'funded',
  approve_milestone: 'milestone_approved',
  release_funds: 'completed',
  dispute: 'disputed',
  resolve_dispute: 'resolved',
};

async function syncMilestoneCompletion(action: PendingActionRow, txHash: string): Promise<void> {
  const contractId = action.contract_id?.trim();
  if (!contractId) return;

  const escrowIds = await hasuraRequest<{ trustlessWorkEscrows: { id: string }[] }>(
    `query MilestoneEscrowId($contractId: String!) {
      trustlessWorkEscrows(where: { contractId: { _eq: $contractId } }, limit: 1) { id }
    }`,
    { contractId },
  );
  const escrowId = escrowIds.trustlessWorkEscrows[0]?.id;
  if (!escrowId) return;

  const milestones = await hasuraRequest<{ escrowMilestones: { id: string; status: string }[] }>(
    `query ReconcileCheckInMilestone($escrowId: uuid!) {
      escrowMilestones(where: { escrowId: { _eq: $escrowId }, milestoneId: { _eq: "check_in" } }, limit: 1) { id status }
    }`,
    { escrowId },
  );
  const milestone = milestones.escrowMilestones[0];
  if (!milestone || milestone.status !== 'pending') return;

  const event = await prepareEscrowLifecycleMessage({
    contractId,
    action: 'mark_milestone_completed',
    fromStatus: milestone.status,
    toStatus: 'completed',
    txHash,
  });
  const data = await hasuraRequest<{
    update_escrowMilestones: { affected_rows: number };
    insert_escrow_transactions_one: { id: string } | null;
  }>(
    `mutation ReconcileMilestoneCompletion($escrowId: uuid!, $log: escrow_transactions_insert_input!${event ? `, ${messageMutationVariable()}` : ''}) {
      update_escrowMilestones(
        where: { id: { _eq: $escrowId }, status: { _eq: "pending" } }
        _set: { status: "completed" }
      ) { affected_rows }
      insert_escrow_transactions_one(object: $log) { id }
      ${event ? messageMutationFields() : ''}
    }`,
    {
      escrowId: milestone.id,
      log: {
        engagement_id: action.engagement_id ?? null,
        contract_id: contractId,
        from_status: 'pending',
        to_status: 'completed',
        action: 'reconciler_mark_milestone_completed',
        tx_hash: null,
        source: 'reconciler',
      },
      ...(event ? { message: lifecycleMessageInput(event.conversationId, event.event) } : {}),
    },
  );
  if (!data.update_escrowMilestones.affected_rows) {
    throw new Error('Milestone changed. Refresh and retry');
  }
}
const STATUS_RANK: Record<string, number> = {
  created: 0,
  funded: 1,
  milestone_approved: 2,
  completed: 3,
  disputed: 1,
  resolved: 4,
  expired: 5,
};

async function getPendingActions(limit = 50): Promise<PendingActionRow[]> {
  const data = await hasuraRequest<{ escrow_transactions: PendingActionRow[] }>(
    `query PendingEscrowTransactions($limit: Int!) {
      escrow_transactions(
        where: {
          tx_hash: { _is_null: false }
          source: { _eq: "submit" }
        }
        order_by: { created_at: asc }
        limit: $limit
      ) {
        id
        action
        contract_id
        engagement_id
        tx_hash
        created_at
      }
    }`,
    { limit },
  );

  return data.escrow_transactions.filter((entry) => typeof entry.tx_hash === 'string' && entry.tx_hash.trim().length > 0);
}

async function getEscrowSnapshots(limit = 50): Promise<EscrowRow[]> {
  const data = await hasuraRequest<{ escrows: EscrowRow[] }>(
    `query ReconcileEscrows($limit: Int!) {
      escrows(order_by: { created_at: asc }, limit: $limit) {
        id
        contract_id
        engagement_id
        status
        amount
        trustless_work_escrows {
          status
        }
      }
    }`,
    { limit },
  );

  return data.escrows.filter((row) => row.contract_id && row.contract_id.trim().length > 0);
}

async function getCurrentEscrowStatus(contractId?: string | null, engagementId?: string | null): Promise<string> {
  if (!contractId && !engagementId) {
    return 'created';
  }

  const data = await hasuraRequest<{
    escrows: { status: string }[];
    trustless_work_escrows: { status: string }[];
  }>(
    `query EscrowStatus($contractId: String, $engagementId: String) {
      escrows(where: {
        _or: [
          { contract_id: { _eq: $contractId } },
          { engagement_id: { _eq: $engagementId } }
        ]
      }, limit: 1) {
        status
      }
      trustless_work_escrows(where: {
        _or: [
          { contractId: { _eq: $contractId } }
        ]
      }, limit: 1) {
        status
      }
    }`,
    { contractId, engagementId },
  );

  const nextStatus = data.escrows[0]?.status ?? data.trustless_work_escrows[0]?.status ?? 'created';
  return nextStatus;
}

async function applyEscrowStatusTransition(params: {
  contractId?: string | null;
  engagementId?: string | null;
  action: string;
  eventAction?: string;
  status: string;
  amount?: string | number | null;
  txHash?: string | null;
  logTxHash?: string | null;
  currentStatus?: string;
  source: 'submit' | 'reconciler' | 'admin';
}): Promise<void> {
  const contractId = params.contractId?.trim();
  if (!contractId) {
    return;
  }

  const currentStatus = await getCurrentEscrowStatus(contractId, params.engagementId);
  const fromStatus = params.currentStatus ?? currentStatus;
  const lifecycleMessage = await prepareEscrowLifecycleMessage({
    contractId,
    action: params.eventAction ?? params.action,
    fromStatus,
    toStatus: params.status,
    txHash: params.txHash,
    amount: params.amount,
    asset: 'USDC',
  });

  const mutation = `mutation ApplyEscrowTransition(
    $contractId: String!
    $status: String!
    $source: String!
    $action: String!
    $fromStatus: String!
    $txHash: String
    $engagementId: String
    ${lifecycleMessage ? messageMutationVariable() : ''}
  ) {
    update_escrows(
      where: { contract_id: { _eq: $contractId } }
      _set: { status: $status }
    ) {
      affected_rows
    }
    update_trustless_work_escrows(
      where: { contractId: { _eq: $contractId } }
      _set: { status: $status }
    ) {
      affected_rows
    }
    insert_escrow_transactions_one(object: {
      contract_id: $contractId
      engagement_id: $engagementId
      from_status: $fromStatus
      to_status: $status
      action: $action
      tx_hash: $txHash
      source: $source
    }) {
      id
    }
    ${lifecycleMessage ? messageMutationFields() : ''}
  }`;

  await hasuraRequest(mutation, {
    contractId,
    status: params.status,
    source: params.source,
    action: params.action,
    fromStatus,
    txHash: params.logTxHash === undefined ? params.txHash ?? null : params.logTxHash,
    engagementId: params.engagementId ?? null,
    ...(lifecycleMessage
      ? { message: lifecycleMessageInput(lifecycleMessage.conversationId, lifecycleMessage.event) }
      : {}),
  });
}

export async function syncEscrows(): Promise<ReconcileSummary> {
  const summary: ReconcileSummary = {
    confirmed: 0,
    failed: 0,
    expired: 0,
    corrected: 0,
    errors: 0,
  };

  const pendingActions = await getPendingActions(50);

  for (const action of pendingActions) {
    const txHash = action.tx_hash?.trim();
    if (!txHash) {
      continue;
    }

    const createdAt = action.created_at ? new Date(action.created_at).getTime() : Date.now();
    if (Date.now() - createdAt < 30_000) {
      continue;
    }

    const status = await confirmTransaction(txHash);
    if (status === 'success') {
      if (action.action === 'mark_milestone_completed') {
        await syncMilestoneCompletion(action, txHash);
        summary.confirmed += 1;
        continue;
      }
      const nextStatus = TRANSITION_MAP[action.action] ?? 'funded';
      const currentStatus = await getCurrentEscrowStatus(action.contract_id, action.engagement_id);
      if (currentStatus === nextStatus) {
        summary.confirmed += 1;
        continue;
      }
      await applyEscrowStatusTransition({
        contractId: action.contract_id,
        engagementId: action.engagement_id,
        action: `reconciler_${action.action}`,
        eventAction: action.action,
        status: nextStatus,
        txHash,
        logTxHash: null,
        source: 'reconciler',
      });
      summary.confirmed += 1;
      continue;
    }

    if (status === 'failed') {
      summary.failed += 1;
      continue;
    }

    if (action.action === 'fund' || action.action === 'initialize') {
      summary.expired += 1;
    }
  }

  const snapshots = await getEscrowSnapshots(50);

  for (const snapshot of snapshots) {
    const explicitStatus = snapshot.status ?? 'created';
    const onChainStatus = snapshot.trustless_work_escrows?.[0]?.status ?? explicitStatus;
    const currentStatus = mapTrustlessWorkStatus(explicitStatus);
    const targetStatus = mapTrustlessWorkStatus(onChainStatus);

    if (!targetStatus || targetStatus === currentStatus) {
      continue;
    }

    const currentRank = STATUS_RANK[currentStatus] ?? 0;
    const targetRank = STATUS_RANK[targetStatus] ?? 0;

    if (targetRank > currentRank) {
      await applyEscrowStatusTransition({
        contractId: snapshot.contract_id,
        engagementId: snapshot.engagement_id,
        action: `reconciler_${targetStatus}`,
        eventAction: 'reconciler_sync',
        status: targetStatus,
        amount: snapshot.amount,
        currentStatus,
        source: 'reconciler',
      });
      summary.corrected += 1;
      continue;
    }

    summary.errors += 1;
  }

  return summary;
}
