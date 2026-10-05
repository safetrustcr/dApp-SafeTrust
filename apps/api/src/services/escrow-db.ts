import { hasuraRequest } from './hasura.js';
import {
  ConcurrentTransitionError,
  assertActionTransition,
  type EscrowActionName,
} from '../domain/escrow-state.js';
import {
  prepareEscrowLifecycleMessage,
  lifecycleMessageInput,
  messageMutationFields,
  messageMutationVariable,
  ensureEscrowConversation,
} from './conversation-events.js';

async function prepareLifecycleMessage(params: {
  contractId: string;
  action: string;
  toStatus: string;
  txHash?: string;
  amount?: number;
}): Promise<{ declaration: string; field: string; message: Record<string, unknown> } | null> {
  const prepared = await prepareEscrowLifecycleMessage(params);
  if (!prepared) return null;
  return {
    declaration: messageMutationVariable(),
    field: messageMutationFields(),
    message: lifecycleMessageInput(prepared.conversationId, prepared.event),
  };
}

function lifecycleArgs(
  prepared: Awaited<ReturnType<typeof prepareLifecycleMessage>>,
): Record<string, unknown> {
  return prepared ? { message: prepared.message } : {};
}

type InitializeParams = {
  contractId: string;
  engagementId: string;
  apartmentId: string;
  senderAddress: string;
  receiverAddress: string;
  releaser: string;
  amount: number;
};

type EscrowIdResult = {
  trustlessWorkEscrows: { id: string }[];
};

type InsertEscrowResult = {
  insert_trustlessWorkEscrows_one: { id: string };
};

type UpdateResult = {
  update_trustlessWorkEscrows?: { affected_rows: number; returning: { id: string }[] };
  update_escrows?: { affected_rows: number; returning: { id: string }[] };
  update_escrowMilestones?: { affected_rows: number; returning: { id: string }[] };
  insert_escrow_transactions_one?: { id: string };
};

type MilestoneUpdateResult = {
  update_escrowMilestones?: { affected_rows: number; returning: { id: string }[] };
};

type TransitionAuditInput = {
  engagement_id?: string | null;
  contract_id?: string | null;
  from_status: string;
  to_status: string;
  action: string;
  tx_hash?: string | null;
  source: 'submit' | 'reconciler' | 'admin';
  actor_uid?: string | null;
  created_at?: string;
};

async function resolveEscrowId(contractId: string): Promise<string> {
  const data = await hasuraRequest<EscrowIdResult>(
    `query GetEscrowId($contractId: String!) {
      trustlessWorkEscrows(where: { contractId: { _eq: $contractId } }) {
        id
      }
    }`,
    { contractId },
  );
  if (data.trustlessWorkEscrows.length === 0) {
    throw new Error(`Escrow not found for contractId: ${contractId}`);
  }
  return data.trustlessWorkEscrows[0].id;
}

function assertAffectedRows(name: string, affectedRows: number, from?: string, to?: string): void {
  if (affectedRows === 0) {
    throw new ConcurrentTransitionError(from, to);
  }
}

/**
 * Reads the current escrows.status for a contract, or null when no escrows
 * row exists yet (e.g. seed-only trustless_work_escrows flows).
 */
export async function getEscrowStatusByContractId(contractId: string): Promise<string | null> {
  const data = await hasuraRequest<{ escrows: { status: string }[] }>(
    `query GetEscrowStatusByContractId($contractId: String!) {
      escrows(where: { contract_id: { _eq: $contractId } }, limit: 1) {
        status
      }
    }`,
    { contractId },
  );
  return data.escrows[0]?.status ?? null;
}

/**
 * Pre-validates an escrow action against the current escrows.status so an
 * invalid transition is rejected with InvalidTransitionError BEFORE any
 * Trustless Work call. Skips validation when no escrows row exists — the
 * conditional updates in the db* functions remain the final guard.
 */
export async function assertEscrowActionAllowed(
  action: EscrowActionName,
  contractId: string,
): Promise<void> {
  const currentStatus = await getEscrowStatusByContractId(contractId);
  if (currentStatus === null) return;
  assertActionTransition(action, currentStatus);
}

function buildAuditLog(
  action: string,
  fromStatus: string,
  toStatus: string,
  contractId: string,
  engagementId?: string,
  txHash?: string,
  source: 'submit' | 'reconciler' | 'admin' = 'submit',
): TransitionAuditInput {
  return {
    engagement_id: engagementId ?? null,
    contract_id: contractId,
    from_status: fromStatus,
    to_status: toStatus,
    action,
    tx_hash: txHash ?? null,
    source,
    actor_uid: null,
    created_at: new Date().toISOString(),
  };
}

export async function dbInitializeEscrow(params: InitializeParams): Promise<{ conversationId: string; apartmentName: string } | null> {
  const existing = await hasuraRequest<EscrowIdResult>(
    `query GetEscrowByContractId($contractId: String!) {
      trustlessWorkEscrows(where: { contractId: { _eq: $contractId } }) {
        id
      }
    }`,
    { contractId: params.contractId },
  );

  let escrowId: string;

  if (existing.trustlessWorkEscrows.length > 0) {
    escrowId = existing.trustlessWorkEscrows[0].id;
  } else {
    const inserted = await hasuraRequest<InsertEscrowResult>(
      `mutation InitializeEscrow($object: trustlessWorkEscrows_insert_input!) {
        insert_trustlessWorkEscrows_one(object: $object) {
          id
        }
      }`,
      {
        object: {
          contractId: params.contractId,
          marker: params.receiverAddress,
          approver: params.senderAddress,
          releaser: params.releaser,
          escrowType: 'single_release',
          status: 'created',
          amount: params.amount,
          balance: 0,
          tenantId: 'safetrust',
        },
      },
    );
    escrowId = inserted.insert_trustlessWorkEscrows_one.id;
  }

  await hasuraRequest(
    `mutation InitializeMilestone($object: escrowMilestones_insert_input!) {
      insert_escrowMilestones_one(
        object: $object
        on_conflict: {
          constraint: unique_escrow_milestone
          update_columns: []
        }
      ) {
        id
      }
    }`,
    {
      object: {
        escrowId,
        milestoneId: 'check_in',
        description: 'Initial check-in milestone',
        amount: params.amount,
        status: 'pending',
        tenantId: 'safetrust',
      },
    },
  );

  const escrowRecord = await hasuraRequest<{
    escrows: { id: string }[];
  }>(
    `query GetEscrowRecordForConversation($contractId: String!) {
      escrows(where: { contract_id: { _eq: $contractId } }, limit: 1) { id }
    }`,
    { contractId: params.contractId },
  );
  const recordId = escrowRecord.escrows[0]?.id;
  if (!recordId) {
    console.warn(`[escrow/events] skipped created event: escrow record missing for ${params.contractId}`);
    return null;
  }
  const conversation = await ensureEscrowConversation({
    apartmentId: params.apartmentId,
    senderAddress: params.senderAddress,
    escrowId: recordId,
  });
  return conversation
    ? { conversationId: conversation.id, apartmentName: conversation.apartmentName }
    : null;
}

export async function dbFundEscrow(
  contractId: string,
  amount: number,
  engagementId?: string,
  txHash?: string,
): Promise<void> {
  const lifecycle = await prepareLifecycleMessage({ contractId, action: 'fund', toStatus: 'funded', txHash, amount });
  const result = await hasuraRequest<UpdateResult>(
    `mutation FundEscrow($contractId: String!, $amount: numeric!, $log: escrow_transactions_insert_input!${lifecycle ? `, ${lifecycle.declaration}` : ''}) {
      update_trustless_work_escrows(
        where: { contractId: { _eq: $contractId }, status: { _eq: "created" } }
        _set: { status: "funded", balance: $amount }
      ) {
        affected_rows
        returning { id }
      }
      update_escrows(
        where: { contract_id: { _eq: $contractId }, status: { _eq: "created" } }
        _set: { status: "funded" }
      ) {
        affected_rows
        returning { id }
      }
      insert_escrow_transactions_one(object: $log) {
        id
      }
      ${lifecycle?.field ?? ''}
    }`,
    {
      contractId,
      amount,
      log: buildAuditLog('fund', 'created', 'funded', contractId, engagementId, txHash),
      ...lifecycleArgs(lifecycle),
    },
  );

  assertAffectedRows('fund', result.update_trustlessWorkEscrows?.affected_rows ?? 0, 'created', 'funded');
  assertAffectedRows('fund', result.update_escrows?.affected_rows ?? 0, 'created', 'funded');
  if (!result.insert_escrow_transactions_one) {
    throw new ConcurrentTransitionError('created', 'funded');
  }
}

export async function dbMarkMilestoneCompleted(
  contractId: string,
  milestoneId: string,
  engagementId?: string,
  txHash?: string,
): Promise<void> {
  const escrowId = await resolveEscrowId(contractId);
  const lifecycle = await prepareLifecycleMessage({
    contractId, action: 'mark_milestone_completed', toStatus: 'funded', txHash,
  });

  // Pre-read: fail before writing when the milestone is not pending — a
  // 0-row root field would otherwise commit the audit log anyway.
  const milestoneBefore = await hasuraRequest<{ escrowMilestones: { status: string }[] }>(
    `query GetMilestoneStatus($escrowId: uuid!, $milestoneId: String!) {
      escrowMilestones(
        where: { escrowId: { _eq: $escrowId }, milestoneId: { _eq: $milestoneId } }
        limit: 1
      ) { status }
    }`,
    { escrowId, milestoneId },
  );
  if (milestoneBefore.escrowMilestones.length === 0) {
    throw new Error(`Milestone not found: ${milestoneId} for contractId: ${contractId}`);
  }
  if (milestoneBefore.escrowMilestones[0].status !== 'pending') {
    throw new ConcurrentTransitionError('pending', 'completed');
  }

  const result = await hasuraRequest<MilestoneUpdateResult & UpdateResult>(
    `mutation CompleteMilestone($escrowId: uuid!, $milestoneId: String!, $log: escrow_transactions_insert_input!${lifecycle ? `, ${lifecycle.declaration}` : ''}) {
      update_escrowMilestones(
        where: {
          escrowId: { _eq: $escrowId }
          milestoneId: { _eq: $milestoneId }
          status: { _eq: "pending" }
        }
        _set: { status: "completed" }
      ) {
        affected_rows
        returning { id }
      }
      insert_escrow_transactions_one(object: $log) {
        id
      }
      ${lifecycle?.field ?? ''}
    }`,
    {
      escrowId,
      milestoneId,
      log: buildAuditLog('mark_milestone_completed', 'pending', 'completed', contractId, engagementId, txHash),
      ...lifecycleArgs(lifecycle),
    },
  );

  assertAffectedRows('mark_milestone_completed', result.update_escrowMilestones?.affected_rows ?? 0, 'pending', 'completed');
  if (!result.insert_escrow_transactions_one) {
    throw new ConcurrentTransitionError('pending', 'completed');
  }
}

export async function dbApproveMilestone(
  contractId: string,
  milestoneId: string,
  approver: string,
  engagementId?: string,
  txHash?: string,
): Promise<void> {
  const escrowId = await resolveEscrowId(contractId);
  const lifecycle = await prepareLifecycleMessage({
    contractId, action: 'approve_milestone', toStatus: 'milestone_approved', txHash,
  });

  // Pre-read: a wrong-state milestone must fail BEFORE any write, because a
  // Hasura mutation commits even when a root field matches 0 rows.
  const milestoneBefore = await hasuraRequest<{ escrowMilestones: { status: string }[] }>(
    `query GetMilestoneStatus($escrowId: uuid!, $milestoneId: String!) {
      escrowMilestones(
        where: { escrowId: { _eq: $escrowId }, milestoneId: { _eq: $milestoneId } }
        limit: 1
      ) { status }
    }`,
    { escrowId, milestoneId },
  );
  if (milestoneBefore.escrowMilestones.length === 0) {
    throw new Error(`Milestone not found: ${milestoneId} for contractId: ${contractId}`);
  }
  if (milestoneBefore.escrowMilestones[0].status !== 'completed') {
    throw new ConcurrentTransitionError('completed', 'approved');
  }

  // Single mutation document: milestone approved + escrow flip + audit log run
  // in one Postgres transaction, so an error in any of them changes nothing.
  // The escrow flip is conditional on `funded` (the only valid `from` status),
  // which also serializes concurrent approvals — the loser matches 0 rows.
  // NOTE: the app only ever creates the single `check_in` milestone, so the
  // milestone and escrow transitions are approved together here.
  const result = await hasuraRequest<MilestoneUpdateResult & UpdateResult>(
    `mutation ApproveMilestone(
      $escrowId: uuid!
      $milestoneId: String!
      $contractId: String!
      $approver: String!
      $approvedAt: timestamptz!
      $log: escrow_transactions_insert_input!
      ${lifecycle ? `${lifecycle.declaration},` : ''}
    ) {
      update_escrowMilestones(
        where: {
          escrowId: { _eq: $escrowId }
          milestoneId: { _eq: $milestoneId }
          status: { _eq: "completed" }
        }
        _set: {
          status: "approved"
          approvedBy: $approver
          approvedAt: $approvedAt
        }
      ) {
        affected_rows
        returning { id }
      }
      update_trustless_work_escrows(
        where: { contractId: { _eq: $contractId }, status: { _eq: "funded" } }
        _set: { status: "milestone_approved" }
      ) {
        affected_rows
        returning { id }
      }
      update_escrows(
        where: { contract_id: { _eq: $contractId }, status: { _eq: "funded" } }
        _set: { status: "milestone_approved" }
      ) {
        affected_rows
        returning { id }
      }
      insert_escrow_transactions_one(object: $log) {
        id
      }
      ${lifecycle?.field ?? ''}
    }`,
    {
      escrowId,
      milestoneId,
      contractId,
      approver,
      approvedAt: new Date().toISOString(),
      log: buildAuditLog('approve_milestone', 'funded', 'milestone_approved', contractId, engagementId, txHash),
      ...lifecycleArgs(lifecycle),
    },
  );
  assertAffectedRows('approve_milestone', result.update_escrowMilestones?.affected_rows ?? 0, 'completed', 'approved');
  assertAffectedRows('approve_milestone', result.update_trustlessWorkEscrows?.affected_rows ?? 0, 'funded', 'milestone_approved');
  assertAffectedRows('approve_milestone', result.update_escrows?.affected_rows ?? 0, 'funded', 'milestone_approved');
  if (!result.insert_escrow_transactions_one) {
    throw new ConcurrentTransitionError('funded', 'milestone_approved');
  }
}

export async function dbReleaseFunds(
  contractId: string,
  releaseSigner: string,
  engagementId?: string,
  txHash?: string,
): Promise<void> {
  const escrowId = await resolveEscrowId(contractId);
  const lifecycle = await prepareLifecycleMessage({
    contractId, action: 'release_funds', toStatus: 'completed', txHash,
  });

  // Pre-read: no approved milestone means the release is in the wrong state —
  // fail before writing anything (a 0-row root field would still commit).
  const approvedMilestones = await hasuraRequest<{
    escrowMilestones_aggregate: { aggregate: { count: number } };
  }>(
    `query CountApprovedMilestones($escrowId: uuid!) {
      escrowMilestones_aggregate(
        where: { escrowId: { _eq: $escrowId }, status: { _eq: "approved" } }
      ) { aggregate { count } }
    }`,
    { escrowId },
  );
  if ((approvedMilestones.escrowMilestones_aggregate.aggregate.count ?? 0) === 0) {
    throw new ConcurrentTransitionError('milestone_approved', 'completed');
  }

  const result = await hasuraRequest<UpdateResult>(
    `mutation ReleaseFunds($escrowId: uuid!, $contractId: String!, $releaseSigner: String!, $releasedAt: timestamptz!, $log: escrow_transactions_insert_input!${lifecycle ? `, ${lifecycle.declaration}` : ''}) {
      update_escrowMilestones(
        where: {
          escrowId: { _eq: $escrowId }
          status: { _eq: "approved" }
        }
        _set: {
          status: "released"
          releasedBy: $releaseSigner
          releasedAt: $releasedAt
        }
      ) {
        affected_rows
        returning { id }
      }
      update_trustless_work_escrows(
        where: { contractId: { _eq: $contractId }, status: { _eq: "milestone_approved" } }
        _set: { status: "completed", balance: 0 }
      ) {
        affected_rows
        returning { id }
      }
      update_escrows(
        where: { contract_id: { _eq: $contractId }, status: { _eq: "milestone_approved" } }
        _set: { status: "completed" }
      ) {
        affected_rows
        returning { id }
      }
      insert_escrow_transactions_one(object: $log) {
        id
      }
      ${lifecycle?.field ?? ''}
    }`,
    {
      escrowId,
      contractId,
      releaseSigner,
      releasedAt: new Date().toISOString(),
      log: buildAuditLog('release_funds', 'milestone_approved', 'completed', contractId, engagementId, txHash),
      ...lifecycleArgs(lifecycle),
    },
  );

  assertAffectedRows('release_funds', result.update_trustlessWorkEscrows?.affected_rows ?? 0, 'milestone_approved', 'completed');
  assertAffectedRows('release_funds', result.update_escrows?.affected_rows ?? 0, 'milestone_approved', 'completed');
  assertAffectedRows('release_funds', result.update_escrowMilestones?.affected_rows ?? 0, 'approved', 'released');
  if (!result.insert_escrow_transactions_one) {
    throw new ConcurrentTransitionError('milestone_approved', 'completed');
  }
}

export async function dbDisputeEscrow(
  contractId: string,
  engagementId?: string,
  txHash?: string,
): Promise<void> {
  const lifecycle = await prepareLifecycleMessage({ contractId, action: 'dispute', toStatus: 'disputed', txHash });
  const result = await hasuraRequest<UpdateResult>(
    `mutation DisputeEscrow($contractId: String!, $log: escrow_transactions_insert_input!${lifecycle ? `, ${lifecycle.declaration}` : ''}) {
      update_trustless_work_escrows(
        where: { contractId: { _eq: $contractId }, status: { _in: ["funded", "milestone_approved"] } }
        _set: { status: "disputed" }
      ) {
        affected_rows
        returning { id }
      }
      update_escrows(
        where: { contract_id: { _eq: $contractId }, status: { _in: ["funded", "milestone_approved"] } }
        _set: { status: "disputed" }
      ) {
        affected_rows
        returning { id }
      }
      insert_escrow_transactions_one(object: $log) {
        id
      }
      ${lifecycle?.field ?? ''}
    }`,
    {
      contractId,
      log: buildAuditLog('dispute', 'funded', 'disputed', contractId, engagementId, txHash),
      ...lifecycleArgs(lifecycle),
    },
  );

  assertAffectedRows('dispute', result.update_trustlessWorkEscrows?.affected_rows ?? 0, 'funded|milestone_approved', 'disputed');
  assertAffectedRows('dispute', result.update_escrows?.affected_rows ?? 0, 'funded|milestone_approved', 'disputed');
  if (!result.insert_escrow_transactions_one) {
    throw new ConcurrentTransitionError('funded|milestone_approved', 'disputed');
  }
}

export async function dbResolveDispute(
  contractId: string,
  engagementId?: string,
  txHash?: string,
): Promise<void> {
  const lifecycle = await prepareLifecycleMessage({ contractId, action: 'resolve_dispute', toStatus: 'resolved', txHash });
  const result = await hasuraRequest<UpdateResult>(
    `mutation ResolveDispute($contractId: String!, $log: escrow_transactions_insert_input!${lifecycle ? `, ${lifecycle.declaration}` : ''}) {
      update_trustless_work_escrows(
        where: { contractId: { _eq: $contractId }, status: { _eq: "disputed" } }
        _set: { status: "resolved", balance: 0 }
      ) {
        affected_rows
        returning { id }
      }
      update_escrows(
        where: { contract_id: { _eq: $contractId }, status: { _eq: "disputed" } }
        _set: { status: "resolved" }
      ) {
        affected_rows
        returning { id }
      }
      insert_escrow_transactions_one(object: $log) {
        id
      }
      ${lifecycle?.field ?? ''}
    }`,
    {
      contractId,
      log: buildAuditLog('resolve_dispute', 'disputed', 'resolved', contractId, engagementId, txHash),
      ...lifecycleArgs(lifecycle),
    },
  );

  assertAffectedRows('resolve_dispute', result.update_trustlessWorkEscrows?.affected_rows ?? 0, 'disputed', 'resolved');
  assertAffectedRows('resolve_dispute', result.update_escrows?.affected_rows ?? 0, 'disputed', 'resolved');
  if (!result.insert_escrow_transactions_one) {
    throw new ConcurrentTransitionError('disputed', 'resolved');
  }
}
