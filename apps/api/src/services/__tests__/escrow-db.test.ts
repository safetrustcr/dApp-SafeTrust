import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dbDisputeEscrow, dbFundEscrow } from '../escrow-db.js';
import { ConcurrentTransitionError } from '../../domain/escrow-state.js';

vi.mock('../hasura.js', () => ({
  hasuraRequest: vi.fn(),
}));

import { hasuraRequest } from '../hasura.js';

const mockedRequest = vi.mocked(hasuraRequest);

function when(value: unknown): void {
  mockedRequest.mockResolvedValueOnce(value as never);
}

type FundResult = {
  update_escrows: { affected_rows: number; returning: { id: string }[] };
  update_trustlessWorkEscrows: { affected_rows: number; returning: { id: string }[] };
  insert_escrow_transactions_one: { id: string };
};

function fundResult(affectedRows: number): FundResult {
  return {
    update_escrows: { affected_rows: affectedRows, returning: affectedRows ? [{ id: 'esc-1' }] : [] },
    update_trustlessWorkEscrows: {
      affected_rows: affectedRows,
      returning: affectedRows ? [{ id: 'tw-1' }] : [],
    },
    insert_escrow_transactions_one: { id: 'log-1' },
  };
}

describe('escrow-db transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('funds both escrow projections and writes the audit row in ONE mutation document', async () => {
    when(fundResult(1));

    await dbFundEscrow('CAZT001', 950, 'engagement-1', 'tx-1');

    expect(mockedRequest).toHaveBeenCalledTimes(1);
    const [query] = mockedRequest.mock.calls[0];
    // Conditional on the `from` state so a stale request cannot double-write.
    expect(query).toContain('status: { _eq: "created" }');
    expect(query).toContain('status: "funded"');
    // Both projections + audit row live in the same Hasura transaction.
    expect(query).toContain('update_escrows');
    expect(query).toContain('update_trustlessWorkEscrows');
    expect(query).toContain('insert_escrow_transactions_one');
  });

  it('maps affected_rows = 0 to ConcurrentTransitionError (409)', async () => {
    when(fundResult(0));

    await expect(dbFundEscrow('CAZT001', 950, 'engagement-1')).rejects.toBeInstanceOf(
      ConcurrentTransitionError,
    );
  });

  it('runs two concurrent identical transitions: exactly one succeeds, the other conflicts', async () => {
    let status = 'created';

    mockedRequest.mockImplementation((((query: string) => {
      if (query.includes('FundEscrow')) {
        const won = status === 'created';
        if (won) status = 'funded';
        return Promise.resolve(fundResult(won ? 1 : 0));
      }
      return Promise.resolve({});
    }) as unknown) as never);

    const results = await Promise.allSettled([
      dbFundEscrow('CAZT001', 950, 'engagement-1'),
      dbFundEscrow('CAZT001', 950, 'engagement-2'),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(ConcurrentTransitionError);
    expect(status).toBe('funded');
  });

  it('conditions a dispute on ALL legal predecessor statuses', async () => {
    when({
      update_escrows: { affected_rows: 1, returning: [{ id: 'esc-1' }] },
      update_trustlessWorkEscrows: { affected_rows: 1, returning: [{ id: 'tw-1' }] },
      insert_escrow_transactions_one: { id: 'log-1' },
    });

    await dbDisputeEscrow('CAZT001', 'engagement-1');

    const [query, variables] = mockedRequest.mock.calls[0];
    expect(query).toContain('status: { _in: $sources }');
    expect(variables).toMatchObject({ sources: ['funded', 'milestone_approved'] });
  });
});
