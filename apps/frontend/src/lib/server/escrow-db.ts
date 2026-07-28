import 'server-only';

import { hasuraRequest } from './hasura';

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
  update_trustlessWorkEscrows: { returning: { id: string }[] };
};

type MilestoneUpdateResult = {
  update_escrowMilestones: { returning: { id: string }[] };
};

type MilestoneAggResult = {
  escrowMilestones_aggregate: {
    aggregate: {
      count: number;
    };
  };
};

type ApprovedMilestoneAggResult = {
  escrowMilestones_aggregate: {
    aggregate: {
      count: number;
    };
  };
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

export async function dbFundEscrow(contractId: string, amount: number): Promise<void> {
  const result = await hasuraRequest<UpdateResult>(
    `mutation FundEscrow($contractId: String!, $amount: numeric!) {
      update_trustlessWorkEscrows(
        where: { contractId: { _eq: $contractId } }
        _set: { status: "funded", balance: $amount }
      ) {
        returning { id }
      }
    }`,
    { contractId, amount },
  );

  if (result.update_trustlessWorkEscrows.returning.length === 0) {
    throw new Error(`Escrow not found for contractId: ${contractId}`);
  }
}

export async function dbApproveMilestone(
  contractId: string,
  milestoneId: string,
  approver: string,
): Promise<void> {
  const escrowId = await resolveEscrowId(contractId);

  const milestoneResult = await hasuraRequest<MilestoneUpdateResult>(
    `mutation ApproveMilestone(
      $escrowId: uuid!
      $milestoneId: String!
      $approver: String!
      $approvedAt: timestamptz!
    ) {
      update_escrowMilestones(
        where: {
          escrowId: { _eq: $escrowId }
          milestoneId: { _eq: $milestoneId }
          status: { _eq: "pending" }
        }
        _set: {
          status: "approved"
          approvedBy: $approver
          approvedAt: $approvedAt
        }
      ) {
        returning { id }
      }
    }`,
    { escrowId, milestoneId, approver, approvedAt: new Date().toISOString() },
  );

  if (milestoneResult.update_escrowMilestones.returning.length === 0) {
    throw new Error(`Milestone not found: ${milestoneId} for contractId: ${contractId}`);
  }

  const totalAgg = await hasuraRequest<MilestoneAggResult>(
    `query TotalMilestones($escrowId: uuid!) {
      escrowMilestones_aggregate(where: { escrowId: { _eq: $escrowId } }) {
        aggregate { count }
      }
    }`,
    { escrowId },
  );

  const approvedAgg = await hasuraRequest<ApprovedMilestoneAggResult>(
    `query ApprovedMilestones($escrowId: uuid!) {
      escrowMilestones_aggregate(
        where: { escrowId: { _eq: $escrowId }, status: { _eq: "approved" } }
      ) {
        aggregate { count }
      }
    }`,
    { escrowId },
  );

  const total = totalAgg.escrowMilestones_aggregate.aggregate.count;
  const approved = approvedAgg.escrowMilestones_aggregate.aggregate.count;

  if (approved >= total) {
    const result = await hasuraRequest<UpdateResult>(
      `mutation ApproveEscrow($escrowId: uuid!) {
        update_trustlessWorkEscrows(
          where: { id: { _eq: $escrowId }, status: { _eq: "funded" } }
          _set: { status: "milestone_approved" }
        ) {
          returning { id }
        }
      }`,
      { escrowId },
    );

    if (result.update_trustlessWorkEscrows.returning.length === 0) {
      throw new Error(`Escrow not found or not in funded state for contractId: ${contractId}`);
    }
  }
}

export async function dbReleaseFunds(contractId: string, releaseSigner: string): Promise<void> {
  const escrowId = await resolveEscrowId(contractId);

  const escrowResult = await hasuraRequest<UpdateResult>(
    `mutation ReleaseFunds($escrowId: uuid!) {
      update_trustlessWorkEscrows(
        where: { id: { _eq: $escrowId } }
        _set: { status: "completed", balance: 0 }
      ) {
        returning { id }
      }
    }`,
    { escrowId },
  );

  if (escrowResult.update_trustlessWorkEscrows.returning.length === 0) {
    throw new Error(`Escrow not found for contractId: ${contractId}`);
  }

  const milestoneResult = await hasuraRequest<MilestoneUpdateResult>(
    `mutation ReleaseMilestones(
      $escrowId: uuid!
      $releaseSigner: String!
      $releasedAt: timestamptz!
    ) {
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
        returning { id }
      }
    }`,
    { escrowId, releaseSigner, releasedAt: new Date().toISOString() },
  );

  if (milestoneResult.update_escrowMilestones.returning.length === 0) {
    throw new Error(`No approved milestones found for contractId: ${contractId}`);
  }
}

export async function dbDisputeEscrow(contractId: string): Promise<void> {
  const result = await hasuraRequest<UpdateResult>(
    `mutation DisputeEscrow($contractId: String!) {
      update_trustlessWorkEscrows(
        where: { contractId: { _eq: $contractId } }
        _set: { status: "disputed" }
      ) {
        returning { id }
      }
    }`,
    { contractId },
  );

  if (result.update_trustlessWorkEscrows.returning.length === 0) {
    throw new Error(`Escrow not found for contractId: ${contractId}`);
  }
}

export async function dbResolveDispute(contractId: string): Promise<void> {
  const result = await hasuraRequest<UpdateResult>(
    `mutation ResolveDispute($contractId: String!) {
      update_trustlessWorkEscrows(
        where: { contractId: { _eq: $contractId } }
        _set: { status: "resolved", balance: 0 }
      ) {
        returning { id }
      }
    }`,
    { contractId },
  );

  if (result.update_trustlessWorkEscrows.returning.length === 0) {
    throw new Error(`Escrow not found for contractId: ${contractId}`);
  }
}
