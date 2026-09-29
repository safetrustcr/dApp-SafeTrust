import { hasuraRequest } from './hasura.js';
import { confirmTransaction } from './stellar-confirm.js';
import { mapTrustlessWorkStatus } from '../lib/trustless-work-status.js';

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
  apartment_id?: string | null;
  amount?: string | number | null;
  contract_id?: string | null;
  engagement_id?: string | null;
  status?: string | null;
  trustless_work_escrows?: { status?: string | null }[];
};

const EVENT_MAP: Record<string, { type: string; text: string }> = {
  funded: { type: 'escrow_funded', text: 'Deposit locked in escrow.' },
  milestone_approved: { type: 'milestone_approved', text: 'A milestone was approved.' },
  completed: { type: 'escrow_completed', text: 'Escrow completed.' },
  disputed: { type: 'escrow_disputed', text: 'A dispute was opened for this escrow.' },
};

async function publishTransitionEvent(contractId: string, status: string, amount?: string | number | null): Promise<void> {
  const event = EVENT_MAP[status];
  if (!event) return;

  const lookup = await hasuraRequest<{ escrows: { id: string; apartment_id: string | null; amount: string | number }[] }>(
    `query EscrowApartment($contractId: String!) { escrows(where: { contract_id: { _eq: $contractId } }, limit: 1) { id apartment_id amount } }`,
    { contractId },
  );
  const escrow = lookup.escrows[0];
  const apartmentId = escrow?.apartment_id;
  if (!apartmentId) return;

  const conversations = await hasuraRequest<{ conversations: { id: string; host_id: string }[] }>(
    `query ApartmentConversation($apartmentId: uuid!) {
      conversations(where: { apartment_id: { _eq: $apartmentId } }, limit: 1) { id host_id }
    }`,
    { apartmentId },
  );
  const conversation = conversations.conversations[0];
  if (!conversation) return;

  const confirmedAmount = amount ?? escrow?.amount;
  const amountText = status === 'funded' && confirmedAmount != null
    ? `Deposit of ${confirmedAmount} USDC is locked in escrow.`
    : event.text;
  await hasuraRequest(
    `mutation PublishEscrowEvent($conversationId: uuid!, $senderId: String!, $body: String!, $eventType: String!, $eventKey: String!) {
      insert_messages_one(object: {
        conversation_id: $conversationId
        sender_id: $senderId
        body: $body
        is_automated: true
        event_type: $eventType
        event_key: $eventKey
        tenant_id: "safetrust"
      }, on_conflict: { constraint: messages_event_key_key, update_columns: [] }) { id }
    }`,
    {
      conversationId: conversation.id,
      senderId: conversation.host_id,
      body: amountText,
      eventType: event.type,
      eventKey: `escrow:${escrow.id}:${status}`,
    },
  );
}

const TRANSITION_MAP: Record<string, string> = {
  fund: 'funded',
  initialize: 'created',
  mark_milestone_completed: 'completed',
  approve_milestone: 'milestone_approved',
  release_funds: 'completed',
  dispute: 'disputed',
  resolve_dispute: 'resolved',
};

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
        apartment_id
        amount
        contract_id
        engagement_id
        status
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
  status: string;
  txHash?: string | null;
  source: 'submit' | 'reconciler' | 'admin';
}): Promise<void> {
  const contractId = params.contractId?.trim();
  if (!contractId) {
    return;
  }

  const currentStatus = await getCurrentEscrowStatus(contractId, params.engagementId);

  const mutation = `mutation ApplyEscrowTransition(
    $contractId: String!
    $status: String!
    $source: String!
    $action: String!
    $fromStatus: String!
    $txHash: String
    $engagementId: String
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
  }`;

  await hasuraRequest(mutation, {
    contractId,
    status: params.status,
    source: params.source,
    action: params.action,
    fromStatus: currentStatus,
    txHash: params.txHash ?? null,
    engagementId: params.engagementId ?? null,
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
      const nextStatus = TRANSITION_MAP[action.action] ?? 'funded';
      await applyEscrowStatusTransition({
        contractId: action.contract_id,
        engagementId: action.engagement_id,
        action: action.action,
        status: nextStatus,
        txHash,
        source: 'reconciler',
      });
      if (action.contract_id) await publishTransitionEvent(action.contract_id, nextStatus);
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
        action: 'reconciler_sync',
        status: targetStatus,
        source: 'reconciler',
      });
      if (snapshot.contract_id) await publishTransitionEvent(snapshot.contract_id, targetStatus, snapshot.amount);
      summary.corrected += 1;
      continue;
    }

    summary.errors += 1;
  }

  return summary;
}
