import { hasuraRequest } from './hasura.js';

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

function assertAffectedRows(name: string, affectedRows: number): void {
  if (affectedRows === 0) {
    throw new Error('Escrow changed. Refresh and retry');
  }
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

export async function dbInitializeEscrow(params: InitializeParams): Promise<void> {
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
}

export async function dbFundEscrow(
  contractId: string,
  amount: number,
  engagementId?: string,
  txHash?: string,
): Promise<void> {
  const result = await hasuraRequest<UpdateResult>(
    `mutation FundEscrow($contractId: String!, $amount: numeric!, $log: escrow_transactions_insert_input!) {
      update_trustless_work_escrows(
        where: { contractId: { _eq: $contractId } }
        _set: { status: "funded", balance: $amount }
      ) {
        affected_rows
        returning { id }
      }
      update_escrows(
        where: { contract_id: { _eq: $contractId } }
        _set: { status: "funded" }
      ) {
        affected_rows
        returning { id }
      }
      insert_escrow_transactions_one(object: $log) {
        id
      }
    }`,
    {
      contractId,
      amount,
      log: buildAuditLog('fund', 'created', 'funded', contractId, engagementId, txHash),
    },
  );

  assertAffectedRows('fund', result.update_trustless_work_escrows?.affected_rows ?? 0);
  assertAffectedRows('fund', result.update_escrows?.affected_rows ?? 0);
  if (!result.insert_escrow_transactions_one) {
    throw new Error('Escrow changed. Refresh and retry');
  }
}

export async function dbMarkMilestoneCompleted(
  contractId: string,
  milestoneId: string,
  engagementId?: string,
  txHash?: string,
): Promise<void> {
  const escrowId = await resolveEscrowId(contractId);
  const result = await hasuraRequest<MilestoneUpdateResult & UpdateResult>(
    `mutation CompleteMilestone($escrowId: uuid!, $milestoneId: String!, $log: escrow_transactions_insert_input!) {
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
    }`,
    {
      escrowId,
      milestoneId,
      log: buildAuditLog('mark_milestone_completed', 'pending', 'completed', contractId, engagementId, txHash),
    },
  );

  assertAffectedRows('mark_milestone_completed', result.update_escrowMilestones?.affected_rows ?? 0);
  if (!result.insert_escrow_transactions_one) {
    throw new Error('Escrow changed. Refresh and retry');
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

  const milestoneResult = await hasuraRequest<MilestoneUpdateResult>(
    `mutation ApproveMilestone(
      $escrowId: uuid!
      $milestoneId: String!
      $approver: String!
      $approvedAt: timestamptz!
      $log: escrow_transactions_insert_input!
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
      insert_escrow_transactions_one(object: $log) {
        id
      }
    }`,
    {
      escrowId,
      milestoneId,
      approver,
      approvedAt: new Date().toISOString(),
      log: buildAuditLog('approve_milestone', 'completed', 'approved', contractId, engagementId, txHash),
    },
  );

  assertAffectedRows('approve_milestone', milestoneResult.update_escrowMilestones?.affected_rows ?? 0);
  if (!milestoneResult.update_escrowMilestones?.returning.length) {
    throw new Error(`Milestone not found: ${milestoneId} for contractId: ${contractId}`);
  }

  type MilestoneCountsResult = {
    total: { aggregate: { count: number } };
    approved: { aggregate: { count: number } };
  };

  const counts = await hasuraRequest<MilestoneCountsResult>(
    `query MilestoneCounts($escrowId: uuid!) {
      total: escrowMilestones_aggregate(where: { escrowId: { _eq: $escrowId } }) {
        aggregate { count }
      }
      approved: escrowMilestones_aggregate(
        where: { escrowId: { _eq: $escrowId }, status: { _eq: "approved" } }
      ) {
        aggregate { count }
      }
    }`,
    { escrowId },
  );

  const total = counts.total.aggregate.count;
  const approved = counts.approved.aggregate.count;

  if (approved >= total) {
    const result = await hasuraRequest<UpdateResult>(
      `mutation ApproveEscrow($contractId: String!, $log: escrow_transactions_insert_input!) {
        update_trustless_work_escrows(
          where: { contractId: { _eq: $contractId } }
          _set: { status: "milestone_approved" }
        ) {
          affected_rows
          returning { id }
        }
        update_escrows(
          where: { contract_id: { _eq: $contractId } }
          _set: { status: "milestone_approved" }
        ) {
          affected_rows
          returning { id }
        }
        insert_escrow_transactions_one(object: $log) {
          id
        }
      }`,
      {
        contractId,
        log: buildAuditLog('approve_milestone', 'funded', 'milestone_approved', contractId, engagementId, txHash),
      },
    );

    assertAffectedRows('approve_milestone', result.update_trustless_work_escrows?.affected_rows ?? 0);
    assertAffectedRows('approve_milestone', result.update_escrows?.affected_rows ?? 0);
    if (!result.insert_escrow_transactions_one) {
      throw new Error('Escrow changed. Refresh and retry');
    }
  }
}

export async function dbReleaseFunds(
  contractId: string,
  releaseSigner: string,
  engagementId?: string,
  txHash?: string,
): Promise<void> {
  const escrowId = await resolveEscrowId(contractId);

  const result = await hasuraRequest<UpdateResult>(
    `mutation ReleaseFunds($escrowId: uuid!, $contractId: String!, $releaseSigner: String!, $releasedAt: timestamptz!, $log: escrow_transactions_insert_input!) {
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
        where: { contractId: { _eq: $contractId } }
        _set: { status: "completed", balance: 0 }
      ) {
        affected_rows
        returning { id }
      }
      update_escrows(
        where: { contract_id: { _eq: $contractId } }
        _set: { status: "completed" }
      ) {
        affected_rows
        returning { id }
      }
      insert_escrow_transactions_one(object: $log) {
        id
      }
    }`,
    {
      escrowId,
      contractId,
      releaseSigner,
      releasedAt: new Date().toISOString(),
      log: buildAuditLog('release_funds', 'milestone_approved', 'completed', contractId, engagementId, txHash),
    },
  );

  if ((result.update_escrowMilestones?.affected_rows ?? 0) === 0) {
    throw new Error(`No approved milestones found for contractId: ${contractId}`);
  }
  assertAffectedRows('release_funds', result.update_trustless_work_escrows?.affected_rows ?? 0);
  assertAffectedRows('release_funds', result.update_escrows?.affected_rows ?? 0);
  if (!result.insert_escrow_transactions_one) {
    throw new Error('Escrow changed. Refresh and retry');
  }
}

export async function dbDisputeEscrow(
  contractId: string,
  engagementId?: string,
  txHash?: string,
): Promise<void> {
  const result = await hasuraRequest<UpdateResult>(
    `mutation DisputeEscrow($contractId: String!, $log: escrow_transactions_insert_input!) {
      update_trustless_work_escrows(
        where: { contractId: { _eq: $contractId } }
        _set: { status: "disputed" }
      ) {
        affected_rows
        returning { id }
      }
      update_escrows(
        where: { contract_id: { _eq: $contractId } }
        _set: { status: "disputed" }
      ) {
        affected_rows
        returning { id }
      }
      insert_escrow_transactions_one(object: $log) {
        id
      }
    }`,
    {
      contractId,
      log: buildAuditLog('dispute', 'funded', 'disputed', contractId, engagementId, txHash),
    },
  );

  assertAffectedRows('dispute', result.update_trustless_work_escrows?.affected_rows ?? 0);
  assertAffectedRows('dispute', result.update_escrows?.affected_rows ?? 0);
  if (!result.insert_escrow_transactions_one) {
    throw new Error('Escrow changed. Refresh and retry');
  }
}

export async function dbResolveDispute(
  contractId: string,
  engagementId?: string,
  txHash?: string,
): Promise<void> {
  const result = await hasuraRequest<UpdateResult>(
    `mutation ResolveDispute($contractId: String!, $log: escrow_transactions_insert_input!) {
      update_trustless_work_escrows(
        where: { contractId: { _eq: $contractId } }
        _set: { status: "resolved", balance: 0 }
      ) {
        affected_rows
        returning { id }
      }
      update_escrows(
        where: { contract_id: { _eq: $contractId } }
        _set: { status: "resolved" }
      ) {
        affected_rows
        returning { id }
      }
      insert_escrow_transactions_one(object: $log) {
        id
      }
    }`,
    {
      contractId,
      log: buildAuditLog('resolve_dispute', 'disputed', 'resolved', contractId, engagementId, txHash),
    },
  );

  assertAffectedRows('resolve_dispute', result.update_trustless_work_escrows?.affected_rows ?? 0);
  assertAffectedRows('resolve_dispute', result.update_escrows?.affected_rows ?? 0);
  if (!result.insert_escrow_transactions_one) {
    throw new Error('Escrow changed. Refresh and retry');
  }
}
