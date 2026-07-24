import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/server/hasura', () => ({
  hasuraRequest: vi.fn(),
}));

import { hasuraRequest } from '@/lib/server/hasura';
import {
  dbInitializeEscrow,
  dbFundEscrow,
  dbApproveMilestone,
  dbReleaseFunds,
  dbDisputeEscrow,
  dbResolveDispute,
} from '@/lib/server/escrow-db';

const mockHasura = vi.mocked(hasuraRequest);

const CONTRACT_ID = 'CA1234';
const ESCROW_ID = '550e8400-e29b-41d4-a716-446655440000';

function escrowReturning(id = ESCROW_ID) {
  return { update_trustlessWorkEscrows: { returning: [{ id }] } };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('dbInitializeEscrow', () => {
  const params = {
    contractId: CONTRACT_ID,
    engagementId: 'eng-1',
    apartmentId: 'apt-1',
    senderAddress: 'GABC',
    receiverAddress: 'GDEF',
    releaser: 'GHIJ',
    amount: 1000,
  };

  it('creates a new escrow and milestone when contractId is new', async () => {
    mockHasura
      .mockResolvedValueOnce({ trustlessWorkEscrows: [] })
      .mockResolvedValueOnce({ insert_trustlessWorkEscrows_one: { id: ESCROW_ID } })
      .mockResolvedValueOnce({ insert_escrowMilestones_one: { id: 'm1' } });

    await dbInitializeEscrow(params);

    expect(mockHasura).toHaveBeenCalledTimes(3);
    expect(mockHasura).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('query GetEscrowByContractId'),
      { contractId: CONTRACT_ID },
    );
    expect(mockHasura).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('mutation InitializeEscrow'),
      expect.objectContaining({
        object: expect.objectContaining({
          contractId: CONTRACT_ID,
          status: 'created',
          marker: 'GDEF',
          approver: 'GABC',
          releaser: 'GHIJ',
          amount: 1000,
          balance: 0,
        }),
      }),
    );
    expect(mockHasura).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('mutation InitializeMilestone'),
      expect.objectContaining({
        object: expect.objectContaining({
          escrowId: ESCROW_ID,
          milestoneId: 'check_in',
          status: 'pending',
        }),
      }),
    );
  });

  it('reuses existing escrow row when contractId already exists', async () => {
    mockHasura
      .mockResolvedValueOnce({ trustlessWorkEscrows: [{ id: ESCROW_ID }] })
      .mockResolvedValueOnce({ insert_escrowMilestones_one: { id: 'm1' } });

    await dbInitializeEscrow(params);

    expect(mockHasura).toHaveBeenCalledTimes(2);
    expect(mockHasura).not.toHaveBeenCalledWith(
      expect.stringContaining('mutation InitializeEscrow'),
      expect.anything(),
    );
  });

  it('creates missing milestone when escrow exists but milestone does not (partial state recovery)', async () => {
    mockHasura
      .mockResolvedValueOnce({ trustlessWorkEscrows: [{ id: ESCROW_ID }] })
      .mockResolvedValueOnce({ insert_escrowMilestones_one: { id: 'm1' } });

    await dbInitializeEscrow(params);

    expect(mockHasura).toHaveBeenCalledTimes(2);
    expect(mockHasura).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('mutation InitializeMilestone'),
      expect.objectContaining({
        object: expect.objectContaining({
          escrowId: ESCROW_ID,
          milestoneId: 'check_in',
          status: 'pending',
        }),
      }),
    );
  });
});

describe('dbFundEscrow', () => {
  it('updates escrow status to funded and sets balance', async () => {
    mockHasura.mockResolvedValueOnce(escrowReturning());

    await dbFundEscrow(CONTRACT_ID, 500);

    expect(mockHasura).toHaveBeenCalledWith(
      expect.stringContaining('mutation FundEscrow'),
      { contractId: CONTRACT_ID, amount: 500 },
    );
  });

  it('throws when no escrow matches contractId', async () => {
    mockHasura.mockResolvedValueOnce({ update_trustlessWorkEscrows: { returning: [] } });

    await expect(dbFundEscrow(CONTRACT_ID, 500)).rejects.toThrow('Escrow not found');
  });
});

describe('dbApproveMilestone', () => {
  it('updates milestone and promotes escrow when all milestones approved', async () => {
    mockHasura
      .mockResolvedValueOnce({ trustlessWorkEscrows: [{ id: ESCROW_ID }] })
      .mockResolvedValueOnce({ update_escrowMilestones: { returning: [{ id: 'm1' }] } })
      .mockResolvedValueOnce({ escrowMilestones_aggregate: { aggregate: { count: 1 } } })
      .mockResolvedValueOnce({ escrowMilestones_aggregate: { aggregate: { count: 1 } } })
      .mockResolvedValueOnce(escrowReturning());

    await dbApproveMilestone(CONTRACT_ID, 'check_in', 'GAPPROVER');

    expect(mockHasura).toHaveBeenCalledTimes(5);
    expect(mockHasura).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('query TotalMilestones'),
      { escrowId: ESCROW_ID },
    );
    expect(mockHasura).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('query ApprovedMilestones'),
      { escrowId: ESCROW_ID },
    );
    expect(mockHasura).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining('mutation ApproveEscrow'),
      { escrowId: ESCROW_ID },
    );
  });

  it('does not promote escrow when not all milestones are approved', async () => {
    mockHasura
      .mockResolvedValueOnce({ trustlessWorkEscrows: [{ id: ESCROW_ID }] })
      .mockResolvedValueOnce({ update_escrowMilestones: { returning: [{ id: 'm1' }] } })
      .mockResolvedValueOnce({ escrowMilestones_aggregate: { aggregate: { count: 2 } } })
      .mockResolvedValueOnce({ escrowMilestones_aggregate: { aggregate: { count: 1 } } });

    await dbApproveMilestone(CONTRACT_ID, 'check_in', 'GAPPROVER');

    expect(mockHasura).toHaveBeenCalledTimes(4);
    expect(mockHasura).not.toHaveBeenCalledWith(
      expect.stringContaining('mutation ApproveEscrow'),
      expect.anything(),
    );
  });

  it('throws when milestone not found', async () => {
    mockHasura
      .mockResolvedValueOnce({ trustlessWorkEscrows: [{ id: ESCROW_ID }] })
      .mockResolvedValueOnce({ update_escrowMilestones: { returning: [] } });

    await expect(
      dbApproveMilestone(CONTRACT_ID, 'nonexistent', 'GAPPROVER'),
    ).rejects.toThrow('Milestone not found');
  });

  it('throws when escrow not found', async () => {
    mockHasura.mockResolvedValueOnce({ trustlessWorkEscrows: [] });

    await expect(
      dbApproveMilestone(CONTRACT_ID, 'check_in', 'GAPPROVER'),
    ).rejects.toThrow('Escrow not found');
  });
});

describe('dbReleaseFunds', () => {
  it('updates escrow and milestones', async () => {
    mockHasura
      .mockResolvedValueOnce({ trustlessWorkEscrows: [{ id: ESCROW_ID }] })
      .mockResolvedValueOnce(escrowReturning())
      .mockResolvedValueOnce({ update_escrowMilestones: { returning: [{ id: 'm1' }] } });

    await dbReleaseFunds(CONTRACT_ID, 'GRELEASER');

    expect(mockHasura).toHaveBeenCalledTimes(3);
    expect(mockHasura).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('query GetEscrowId'),
      { contractId: CONTRACT_ID },
    );
    expect(mockHasura).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('mutation ReleaseFunds'),
      { escrowId: ESCROW_ID },
    );
    expect(mockHasura).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('mutation ReleaseMilestones'),
      expect.objectContaining({ escrowId: ESCROW_ID, releaseSigner: 'GRELEASER' }),
    );
  });

  it('throws when escrow not found', async () => {
    mockHasura
      .mockResolvedValueOnce({ trustlessWorkEscrows: [{ id: ESCROW_ID }] })
      .mockResolvedValueOnce({ update_trustlessWorkEscrows: { returning: [] } });

    await expect(dbReleaseFunds(CONTRACT_ID, 'GRELEASER')).rejects.toThrow('Escrow not found');
  });

  it('throws when no approved milestones to release', async () => {
    mockHasura
      .mockResolvedValueOnce({ trustlessWorkEscrows: [{ id: ESCROW_ID }] })
      .mockResolvedValueOnce(escrowReturning())
      .mockResolvedValueOnce({ update_escrowMilestones: { returning: [] } });

    await expect(dbReleaseFunds(CONTRACT_ID, 'GRELEASER')).rejects.toThrow(
      'No approved milestones found',
    );
  });
});

describe('dbDisputeEscrow', () => {
  it('updates escrow status to disputed', async () => {
    mockHasura.mockResolvedValueOnce(escrowReturning());

    await dbDisputeEscrow(CONTRACT_ID);

    expect(mockHasura).toHaveBeenCalledWith(
      expect.stringContaining('mutation DisputeEscrow'),
      { contractId: CONTRACT_ID },
    );
  });

  it('throws when escrow not found', async () => {
    mockHasura.mockResolvedValueOnce({ update_trustlessWorkEscrows: { returning: [] } });

    await expect(dbDisputeEscrow(CONTRACT_ID)).rejects.toThrow('Escrow not found');
  });
});

describe('dbResolveDispute', () => {
  it('updates escrow status to resolved and clears balance', async () => {
    mockHasura.mockResolvedValueOnce(escrowReturning());

    await dbResolveDispute(CONTRACT_ID);

    expect(mockHasura).toHaveBeenCalledWith(
      expect.stringContaining('mutation ResolveDispute'),
      { contractId: CONTRACT_ID },
    );
  });

  it('throws when escrow not found', async () => {
    mockHasura.mockResolvedValueOnce({ update_trustlessWorkEscrows: { returning: [] } });

    await expect(dbResolveDispute(CONTRACT_ID)).rejects.toThrow('Escrow not found');
  });
});
