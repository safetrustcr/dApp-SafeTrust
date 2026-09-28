import { hasuraRequest } from './hasura.js';
import {
  assertTransition,
  ConcurrentTransitionError,
  transitionSources,
} from '../domain/escrow-state.js';

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

/**
 * A conditional update returning zero rows means somebody else already moved the
 * escrow (or it was never in the expected state). Surface it as a conflict so the
 * caller can answer 409 instead of silently double-writing.
 */
function assertTransitionApplied(
  affectedRows: number,
  from: string,
  to: string,
  contractId: string,
): void {
  if (affectedRows === 0) {
    throw new ConcurrentTransitionError(from, to, contractId);
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

/**
 * `created -> funded`.
 *
 * Both escrow projections and the audit row are written by a single Hasura
 * mutation, so a failure in any root field rolls the whole transition back:
 * the tables can never disagree about whether the escrow is funded.
 */
export async function dbFundEscrow(
  contractId: string,
  amount: number,
  engagementId?: string,
  txHash?: string,
): Promise<void> {
  assertTransition('created', 'funded');

  const result = await hasuraRequest<UpdateResult>(
    `mutation FundEscrow($contractId: String!, $amount: numeric!, $log: escrow_transactions_insert_input!) {
      update_escrows(
        where: { contract_id: { _eq: $contractId }, status: { _eq: "created" } }
        _set: { status: "funded" }
      ) {
        affected_rows
        returning { id }
      }
      update_trustlessWorkEscrows(
        where: { contractId: { _eq: $contractId }, status: { _eq: "created" } }
        _set: { status: "funded", balance: $amount }
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

  assertTransitionApplied(result.update_escrows?.affected_rows ?? 0, 'created', 'funded', contractId);
  assertTransitionApplied(
    result.update_trustlessWorkEscrows?.affected_rows ?? 0,
    'created',
    'funded',
    contractId,
  );
  if (!result.insert_escrow_transactions_one) {
    throw new ConcurrentTransitionError('created', 'funded', contractId);
  }
}

/**
 * Milestone `pending -> completed`.
 *
 * The milestone transition is guarded by its own `status` condition; the audit
 * row ships in the same mutation so the two never drift apart.
 */
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

  assertTransitionApplied(
    result.update_escrowMilestones?.affected_rows ?? 0,
    'pending',
    'completed',
    contractId,
  );
  if (!result.insert_escrow_transactions_one) {
    throw new ConcurrentTransitionError('pending', 'completed', contractId);
  }
}

/**
 * Milestone `completed -> approved`, and — once every milestone is approved —
 * the escrow `funded -> milestone_approved` projection.
 *
 * The escrow transition depends on an aggregate count, so it is a second
 * mutation document. That document still carries both escrow projections in a
 * single request, keeping them atomic. It deliberately does not add a second
 * `approve_milestone` audit row: `ux_escrow_transactions_engagement_action`
 * allows only one row per (engagement_id, action).
 */
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

  assertTransitionApplied(
    milestoneResult.update_escrowMilestones?.affected_rows ?? 0,
    'completed',
    'approved',
    contractId,
  );

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
    assertTransition('funded', 'milestone_approved');

    const result = await hasuraRequest<UpdateResult>(
      `mutation ApproveEscrow($contractId: String!) {
        update_escrows(
          where: { contract_id: { _eq: $contractId }, status: { _eq: "funded" } }
          _set: { status: "milestone_approved" }
        ) {
          affected_rows
          returning { id }
        }
        update_trustlessWorkEscrows(
          where: { contractId: { _eq: $contractId }, status: { _eq: "funded" } }
          _set: { status: "milestone_approved" }
        ) {
          affected_rows
          returning { id }
        }
      }`,
      { contractId },
    );

    assertTransitionApplied(
      result.update_escrows?.affected_rows ?? 0,
      'funded',
      'milestone_approved',
      contractId,
    );
    assertTransitionApplied(
      result.update_trustlessWorkEscrows?.affected_rows ?? 0,
      'funded',
      'milestone_approved',
      contractId,
    );
  }
}

/**
 * `milestone_approved -> completed` (release funds).
 *
 * Milestone release, both escrow projections and the audit row are one Hasura
 * mutation, so the lifecycle tables and `escrows` move together.
 */
export async function dbReleaseFunds(
  contractId: string,
  releaseSigner: string,
  engagementId?: string,
  txHash?: string,
): Promise<void> {
  assertTransition('milestone_approved', 'completed');
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
      update_escrows(
        where: { contract_id: { _eq: $contractId }, status: { _eq: "milestone_approved" } }
        _set: { status: "completed" }
      ) {
        affected_rows
        returning { id }
      }
      update_trustlessWorkEscrows(
        where: { contractId: { _eq: $contractId }, status: { _eq: "milestone_approved" } }
        _set: { status: "completed", balance: 0 }
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

  assertTransitionApplied(
    result.update_escrowMilestones?.affected_rows ?? 0,
    'approved',
    'released',
    contractId,
  );
  assertTransitionApplied(
    result.update_escrows?.affected_rows ?? 0,
    'milestone_approved',
    'completed',
    contractId,
  );
  assertTransitionApplied(
    result.update_trustlessWorkEscrows?.affected_rows ?? 0,
    'milestone_approved',
    'completed',
    contractId,
  );
  if (!result.insert_escrow_transactions_one) {
    throw new ConcurrentTransitionError('milestone_approved', 'completed', contractId);
  }
}

/**
 * `funded|milestone_approved -> disputed`.
 *
 * `disputed` has two legal predecessors, so the conditional update matches the
 * whole source set instead of a single `from`.
 */
export async function dbDisputeEscrow(
  contractId: string,
  engagementId?: string,
  txHash?: string,
): Promise<void> {
  const sources = transitionSources('disputed');
  const result = await hasuraRequest<UpdateResult>(
    `mutation DisputeEscrow($contractId: String!, $sources: [String!]!, $log: escrow_transactions_insert_input!) {
      update_escrows(
        where: { contract_id: { _eq: $contractId }, status: { _in: $sources } }
        _set: { status: "disputed" }
      ) {
        affected_rows
        returning { id }
      }
      update_trustlessWorkEscrows(
        where: { contractId: { _eq: $contractId }, status: { _in: $sources } }
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
      sources,
      log: buildAuditLog('dispute', sources.join('|'), 'disputed', contractId, engagementId, txHash),
    },
  );

  assertTransitionApplied(
    result.update_escrows?.affected_rows ?? 0,
    sources.join('|'),
    'disputed',
    contractId,
  );
  assertTransitionApplied(
    result.update_trustlessWorkEscrows?.affected_rows ?? 0,
    sources.join('|'),
    'disputed',
    contractId,
  );
  if (!result.insert_escrow_transactions_one) {
    throw new ConcurrentTransitionError(sources.join('|'), 'disputed', contractId);
  }
}

/** `disputed -> resolved`. */
export async function dbResolveDispute(
  contractId: string,
  engagementId?: string,
  txHash?: string,
): Promise<void> {
  assertTransition('disputed', 'resolved');
  const result = await hasuraRequest<UpdateResult>(
    `mutation ResolveDispute($contractId: String!, $log: escrow_transactions_insert_input!) {
      update_escrows(
        where: { contract_id: { _eq: $contractId }, status: { _eq: "disputed" } }
        _set: { status: "resolved" }
      ) {
        affected_rows
        returning { id }
      }
      update_trustlessWorkEscrows(
        where: { contractId: { _eq: $contractId }, status: { _eq: "disputed" } }
        _set: { status: "resolved", balance: 0 }
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

  assertTransitionApplied(result.update_escrows?.affected_rows ?? 0, 'disputed', 'resolved', contractId);
  assertTransitionApplied(
    result.update_trustlessWorkEscrows?.affected_rows ?? 0,
    'disputed',
    'resolved',
    contractId,
  );
  if (!result.insert_escrow_transactions_one) {
    throw new ConcurrentTransitionError('disputed', 'resolved', contractId);
  }
}
