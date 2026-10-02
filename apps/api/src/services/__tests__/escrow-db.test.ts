import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('../hasura.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hasura.js')>();
  return { ...actual, hasuraRequest: vi.fn() };
});

vi.mock('../conversation-events.js', () => ({
  prepareEscrowLifecycleMessage: vi.fn().mockResolvedValue(null),
  lifecycleMessageInput: vi.fn(),
  messageMutationFields: vi.fn(),
  messageMutationVariable: vi.fn(),
  ensureEscrowConversation: vi.fn(),
}));

import { hasuraRequest } from '../hasura.js';
import {
  dbFundEscrow,
  dbMarkMilestoneCompleted,
  dbApproveMilestone,
  dbReleaseFunds,
  dbDisputeEscrow,
  assertEscrowActionAllowed,
} from '../escrow-db.js';
import { ConcurrentTransitionError, InvalidTransitionError } from '../../domain/escrow-state.js';

const requestMock = hasuraRequest as unknown as Mock;

const ESCROW_ID_OK = { trustlessWorkEscrows: [{ id: 'tw-1' }] };

function logRow() {
  return { insert_escrow_transactions_one: { id: 'tx-1' } };
}

describe('dbFundEscrow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates both escrow tables in one document with created as the only from-status', async () => {
    requestMock.mockResolvedValue({
      update_trustlessWorkEscrows: { affected_rows: 1, returning: [{ id: 'tw-1' }] },
      update_escrows: { affected_rows: 1, returning: [{ id: 'e-1' }] },
      ...logRow(),
    });

    await dbFundEscrow('CA1', 100, 'eng-1', 'hash-1');

    expect(requestMock).toHaveBeenCalledTimes(1);
    const [query, vars] = requestMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain('mutation FundEscrow');
    expect(query).toContain('status: { _eq: "created" }');
    expect(query).toContain('_set: { status: "funded", balance: $amount }');
    expect(vars.log).toMatchObject({
      action: 'fund',
      from_status: 'created',
      to_status: 'funded',
      engagement_id: 'eng-1',
      tx_hash: 'hash-1',
    });
  });

  it('throws ConcurrentTransitionError when the escrow table matched no rows', async () => {
    requestMock.mockResolvedValue({
      update_trustlessWorkEscrows: { affected_rows: 1, returning: [{ id: 'tw-1' }] },
      update_escrows: { affected_rows: 0, returning: [] },
      ...logRow(),
    });

    await expect(dbFundEscrow('CA1', 100)).rejects.toThrow(ConcurrentTransitionError);
    await expect(dbFundEscrow('CA1', 100)).rejects.toThrow('Escrow changed. Refresh and retry');
  });
});

describe('dbMarkMilestoneCompleted', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fails before writing when the milestone is not pending', async () => {
    requestMock.mockImplementation(async (query: string) => {
      if (query.includes('GetEscrowId')) return ESCROW_ID_OK;
      if (query.includes('GetMilestoneStatus')) return { escrowMilestones: [{ status: 'completed' }] };
      throw new Error(`unexpected query: ${query.slice(0, 60)}`);
    });

    await expect(dbMarkMilestoneCompleted('CA1', 'check_in')).rejects.toThrow(
      ConcurrentTransitionError,
    );
    expect(requestMock).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(requestMock.mock.calls)).not.toContain('CompleteMilestone');
  });

  it('marks the milestone and writes the audit log in one document', async () => {
    requestMock.mockImplementation(async (query: string) => {
      if (query.includes('GetEscrowId')) return ESCROW_ID_OK;
      if (query.includes('GetMilestoneStatus')) return { escrowMilestones: [{ status: 'pending' }] };
      if (query.includes('mutation CompleteMilestone')) {
        return {
          update_escrowMilestones: { affected_rows: 1, returning: [{ id: 'm-1' }] },
          ...logRow(),
        };
      }
      throw new Error(`unexpected query: ${query.slice(0, 60)}`);
    });

    await dbMarkMilestoneCompleted('CA1', 'check_in', 'eng-1');

    expect(requestMock).toHaveBeenCalledTimes(3);
    const [query] = requestMock.mock.calls[2] as [string];
    expect(query).toContain('status: { _eq: "pending" }');
  });
});

describe('dbApproveMilestone', () => {
  beforeEach(() => vi.clearAllMocks());

  const happyQuery = async (query: string) => {
    if (query.includes('GetEscrowId')) return ESCROW_ID_OK;
    if (query.includes('GetMilestoneStatus')) return { escrowMilestones: [{ status: 'completed' }] };
    if (query.includes('mutation ApproveMilestone')) {
      return {
        update_escrowMilestones: { affected_rows: 1, returning: [{ id: 'm-1' }] },
        update_trustlessWorkEscrows: { affected_rows: 1, returning: [{ id: 'tw-1' }] },
        update_escrows: { affected_rows: 1, returning: [{ id: 'e-1' }] },
        ...logRow(),
      };
    }
    throw new Error(`unexpected query: ${query.slice(0, 60)}`);
  };

  it('performs milestone, escrow flip and audit log as one mutation document', async () => {
    requestMock.mockImplementation(happyQuery);

    await dbApproveMilestone('CA1', 'check_in', 'GOWNER', 'eng-1');

    expect(requestMock).toHaveBeenCalledTimes(3);
    const [query, vars] = requestMock.mock.calls[2] as [string, Record<string, unknown>];
    expect(query).toContain('mutation ApproveMilestone');
    expect(query).toContain('update_escrowMilestones');
    expect(query).toContain('update_trustless_work_escrows');
    expect(query).toContain('update_escrows');
    expect(query).toContain('insert_escrow_transactions_one');
    expect(query).toContain('status: { _eq: "funded" }');
    expect(vars.log).toMatchObject({ action: 'approve_milestone', to_status: 'milestone_approved' });
  });

  it('fails before any write when the milestone is not completed', async () => {
    requestMock.mockImplementation(async (query: string) => {
      if (query.includes('GetEscrowId')) return ESCROW_ID_OK;
      if (query.includes('GetMilestoneStatus')) return { escrowMilestones: [{ status: 'pending' }] };
      throw new Error(`unexpected query: ${query.slice(0, 60)}`);
    });

    await expect(dbApproveMilestone('CA1', 'check_in', 'GOWNER')).rejects.toThrow(
      ConcurrentTransitionError,
    );
    expect(JSON.stringify(requestMock.mock.calls)).not.toContain('ApproveMilestone');
  });
});

describe('dbReleaseFunds', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fails before writing when no milestone is approved', async () => {
    requestMock.mockImplementation(async (query: string) => {
      if (query.includes('GetEscrowId')) return ESCROW_ID_OK;
      if (query.includes('CountApprovedMilestones')) {
        return { escrowMilestones_aggregate: { aggregate: { count: 0 } } };
      }
      throw new Error(`unexpected query: ${query.slice(0, 60)}`);
    });

    await expect(dbReleaseFunds('CA1', 'GRELEASER')).rejects.toThrow(ConcurrentTransitionError);
    expect(requestMock).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(requestMock.mock.calls)).not.toContain('ReleaseFunds');
  });

  it('releases escrow + milestone + audit log in one conditional document', async () => {
    requestMock.mockImplementation(async (query: string) => {
      if (query.includes('GetEscrowId')) return ESCROW_ID_OK;
      if (query.includes('CountApprovedMilestones')) {
        return { escrowMilestones_aggregate: { aggregate: { count: 1 } } };
      }
      if (query.includes('mutation ReleaseFunds')) {
        return {
          update_escrowMilestones: { affected_rows: 1, returning: [{ id: 'm-1' }] },
          update_trustlessWorkEscrows: { affected_rows: 1, returning: [{ id: 'tw-1' }] },
          update_escrows: { affected_rows: 1, returning: [{ id: 'e-1' }] },
          ...logRow(),
        };
      }
      throw new Error(`unexpected query: ${query.slice(0, 60)}`);
    });

    await dbReleaseFunds('CA1', 'GRELEASER', 'eng-1');

    expect(requestMock).toHaveBeenCalledTimes(3);
    const [query, vars] = requestMock.mock.calls[2] as [string, Record<string, unknown>];
    expect(query).toContain('status: { _eq: "milestone_approved" }');
    expect(query).toContain('_set: { status: "completed", balance: 0 }');
    expect(query).toContain('status: { _eq: "approved" }');
    expect(vars.log).toMatchObject({ action: 'release_funds', from_status: 'milestone_approved' });
  });

  it('lets exactly one of two concurrent releases win', async () => {
    let mutationTaken = false;
    requestMock.mockImplementation(async (query: string) => {
      if (query.includes('GetEscrowId')) return ESCROW_ID_OK;
      if (query.includes('CountApprovedMilestones')) {
        return { escrowMilestones_aggregate: { aggregate: { count: 1 } } };
      }
      if (query.includes('mutation ReleaseFunds')) {
        if (mutationTaken) {
          return {
            update_escrowMilestones: { affected_rows: 0, returning: [] },
            update_trustlessWorkEscrows: { affected_rows: 0, returning: [] },
            update_escrows: { affected_rows: 0, returning: [] },
            ...logRow(),
          };
        }
        mutationTaken = true;
        return {
          update_escrowMilestones: { affected_rows: 1, returning: [{ id: 'm-1' }] },
          update_trustlessWorkEscrows: { affected_rows: 1, returning: [{ id: 'tw-1' }] },
          update_escrows: { affected_rows: 1, returning: [{ id: 'e-1' }] },
          ...logRow(),
        };
      }
      throw new Error(`unexpected query: ${query.slice(0, 60)}`);
    });

    const results = await Promise.allSettled([
      dbReleaseFunds('CA1', 'GRELEASER'),
      dbReleaseFunds('CA1', 'GRELEASER'),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(ConcurrentTransitionError);
    expect((rejected[0].reason as Error).message).toBe('Escrow changed. Refresh and retry');
  });
});

describe('dbDisputeEscrow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('only disputes from funded or milestone_approved', async () => {
    requestMock.mockResolvedValue({
      update_trustlessWorkEscrows: { affected_rows: 1, returning: [{ id: 'tw-1' }] },
      update_escrows: { affected_rows: 1, returning: [{ id: 'e-1' }] },
      ...logRow(),
    });

    await dbDisputeEscrow('CA1', 'eng-1');

    const [query] = requestMock.mock.calls[0] as [string];
    expect(query).toContain('status: { _in: ["funded", "milestone_approved"] }');
    expect(query).toContain('_set: { status: "disputed" }');
  });

  it('throws ConcurrentTransitionError when nothing matched', async () => {
    requestMock.mockResolvedValue({
      update_trustlessWorkEscrows: { affected_rows: 0, returning: [] },
      update_escrows: { affected_rows: 0, returning: [] },
      ...logRow(),
    });

    await expect(dbDisputeEscrow('CA1')).rejects.toBeInstanceOf(ConcurrentTransitionError);
  });
});

describe('assertEscrowActionAllowed', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects fund when the escrow is already completed', async () => {
    requestMock.mockResolvedValue({ escrows: [{ status: 'completed' }] });

    await expect(assertEscrowActionAllowed('fund', 'CA1')).rejects.toBeInstanceOf(
      InvalidTransitionError,
    );
    await expect(assertEscrowActionAllowed('fund', 'CA1')).rejects.toThrow(
      'invalid escrow transition completed -> funded',
    );
  });

  it('allows fund from created', async () => {
    requestMock.mockResolvedValue({ escrows: [{ status: 'created' }] });
    await expect(assertEscrowActionAllowed('fund', 'CA1')).resolves.toBeUndefined();
  });

  it('skips validation when no escrows row exists yet', async () => {
    requestMock.mockResolvedValue({ escrows: [] });
    await expect(assertEscrowActionAllowed('fund', 'CA1')).resolves.toBeUndefined();
  });

  it('rejects an unknown status string from the DB', async () => {
    requestMock.mockResolvedValue({ escrows: [{ status: 'legacy_state' }] });
    await expect(assertEscrowActionAllowed('release_funds', 'CA1')).rejects.toBeInstanceOf(
      InvalidTransitionError,
    );
  });
});
