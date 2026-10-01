import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../services/trustlesswork.js', () => ({
  trustlessWorkRequest: vi.fn(),
  extractTransactionHash: vi.fn(
    (result: { transactionHash?: string; txHash?: string } | undefined) =>
      result?.transactionHash ?? result?.txHash ?? undefined,
  ),
  TrustlessWorkRequestError: class extends Error {
    statusCode: number;
    messages?: string[];
    payload?: unknown;
    constructor(message: string, statusCode: number, messages?: string[], payload?: unknown) {
      super(message);
      this.statusCode = statusCode;
      this.messages = messages;
      this.payload = payload;
    }
  },
  getErrorMessages: vi.fn((err: unknown, fallback: string) => [
    (err as Error)?.message || fallback,
  ]),
}));

vi.mock('../../../services/escrow-db.js', () => ({
  assertEscrowActionAllowed: vi.fn(async () => {}),
  dbInitializeEscrow: vi.fn(async () => {}),
  dbFundEscrow: vi.fn(async () => {}),
  dbMarkMilestoneCompleted: vi.fn(async () => {}),
  dbApproveMilestone: vi.fn(async () => {}),
  dbReleaseFunds: vi.fn(async () => {}),
  dbDisputeEscrow: vi.fn(async () => {}),
  dbResolveDispute: vi.fn(async () => {}),
  getEscrowStatusByContractId: vi.fn(async () => 'created'),
}));

vi.mock('../../../services/stellar-confirm.js', () => ({
  confirmTransactionWithRetry: vi.fn(async () => 'success'),
}));

import { sendTransactionHandler } from '../send-transaction.handler.js';
import {
  trustlessWorkRequest,
  extractTransactionHash,
} from '../../../services/trustlesswork.js';
import {
  assertEscrowActionAllowed,
  dbFundEscrow,
  dbReleaseFunds,
} from '../../../services/escrow-db.js';
import { confirmTransactionWithRetry } from '../../../services/stellar-confirm.js';
import { InvalidTransitionError, ConcurrentTransitionError } from '../../../domain/escrow-state.js';
import { HasuraRequestError } from '../../../services/hasura.js';
import { mockReq, mockRes } from './helpers.js';

const FUND_BODY = {
  signedXdr: 'SIGNED_XDR',
  action: 'fund' as const,
  contractId: 'CA1',
  engagementId: 'eng-1',
  amount: 100,
};

const RELEASE_BODY = {
  signedXdr: 'SIGNED_XDR',
  action: 'release_funds' as const,
  contractId: 'CA1',
  engagementId: 'eng-1',
  releaseSigner: 'GRELEASER',
};

describe('sendTransactionHandler transition guards', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 409 before any Trustless Work call when the transition is invalid', async () => {
    vi.mocked(assertEscrowActionAllowed).mockImplementation(async () => {
      throw new InvalidTransitionError('completed', 'funded', 'fund');
    });

    const res = mockRes();
    const returned = await sendTransactionHandler(mockReq(FUND_BODY) as never, res as never);

    expect(res._status).toBe(409);
    expect(res._body).toEqual({
      error: 'invalid escrow transition completed -> funded',
      from: 'completed',
      to: 'funded',
    });
    expect(trustlessWorkRequest).not.toHaveBeenCalled();
    expect(dbFundEscrow).not.toHaveBeenCalled();
    expect((returned as unknown as typeof res)._status).toBe(409);
  });

  it('submits and persists a valid fund transition', async () => {
    vi.mocked(assertEscrowActionAllowed).mockResolvedValue(undefined);
    vi.mocked(trustlessWorkRequest).mockResolvedValue({
      status: 'SUCCESS',
      message: 'funded',
      contractId: 'CA1',
      transactionHash: 'hash-1',
    } as never);
    vi.mocked(extractTransactionHash).mockReturnValue('hash-1');
    vi.mocked(confirmTransactionWithRetry).mockResolvedValue('success' as never);

    const res = mockRes();
    await sendTransactionHandler(mockReq(FUND_BODY) as never, res as never);

    expect(trustlessWorkRequest).toHaveBeenCalledTimes(1);
    expect(dbFundEscrow).toHaveBeenCalledWith('CA1', 100, 'eng-1', 'hash-1');
    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({ status: 'SUCCESS', contractId: 'CA1' });
  });

  it('returns 409 when the conditional update loses a concurrent race', async () => {
    vi.mocked(assertEscrowActionAllowed).mockResolvedValue(undefined);
    vi.mocked(trustlessWorkRequest).mockResolvedValue({
      status: 'SUCCESS',
      message: 'released',
      contractId: 'CA1',
      transactionHash: 'hash-2',
    } as never);
    vi.mocked(extractTransactionHash).mockReturnValue('hash-2');
    vi.mocked(dbReleaseFunds).mockImplementation(async () => {
      throw new ConcurrentTransitionError('milestone_approved', 'completed');
    });

    const res = mockRes();
    await sendTransactionHandler(mockReq(RELEASE_BODY) as never, res as never);

    expect(res._status).toBe(409);
    expect(res._body).toMatchObject({
      error: 'Escrow changed. Refresh and retry',
      from: 'milestone_approved',
      to: 'completed',
    });
  });

  it('returns 409 for a unique violation (duplicate transition rolled back atomically)', async () => {
    vi.mocked(assertEscrowActionAllowed).mockResolvedValue(undefined);
    vi.mocked(trustlessWorkRequest).mockResolvedValue({
      status: 'SUCCESS',
      message: 'funded',
      contractId: 'CA1',
      transactionHash: 'hash-3',
    } as never);
    vi.mocked(extractTransactionHash).mockReturnValue('hash-3');
    vi.mocked(dbFundEscrow).mockImplementation(async () => {
      throw new HasuraRequestError('duplicate key value violates unique constraint', [
        {
          message:
            'duplicate key value violates unique constraint "escrow_transactions_engagement_action_key"',
          extensions: { code: 'unique_violation' },
        },
      ]);
    });

    const res = mockRes();
    await sendTransactionHandler(mockReq(FUND_BODY) as never, res as never);

    expect(res._status).toBe(409);
    expect(res._body).toEqual({ error: 'Escrow changed. Refresh and retry' });
  });

  it('lets exactly one of two concurrent identical transitions succeed', async () => {
    vi.mocked(assertEscrowActionAllowed).mockResolvedValue(undefined);
    vi.mocked(trustlessWorkRequest).mockResolvedValue({
      status: 'SUCCESS',
      message: 'released',
      contractId: 'CA1',
      transactionHash: 'hash-4',
    } as never);
    vi.mocked(extractTransactionHash).mockReturnValue('hash-4');

    let released = false;
    vi.mocked(dbReleaseFunds).mockImplementation(async () => {
      if (released) throw new ConcurrentTransitionError('milestone_approved', 'completed');
      released = true;
    });

    const resOne = mockRes();
    const resTwo = mockRes();
    await Promise.all([
      sendTransactionHandler(mockReq(RELEASE_BODY) as never, resOne as never),
      sendTransactionHandler(mockReq(RELEASE_BODY) as never, resTwo as never),
    ]);

    const statuses = [resOne._status, resTwo._status].sort();
    expect(statuses).toEqual([200, 409]);
    const conflict = resOne._status === 409 ? resOne : resTwo;
    expect(conflict._body).toMatchObject({ error: 'Escrow changed. Refresh and retry' });
  });

  it('rejects an unknown action with 400 without pre-validating', async () => {
    const res = mockRes();
    await sendTransactionHandler(
      mockReq({ ...FUND_BODY, action: 'self_destruct' }) as never,
      res as never,
    );

    expect(res._status).toBe(400);
    expect(assertEscrowActionAllowed).not.toHaveBeenCalled();
    expect(trustlessWorkRequest).not.toHaveBeenCalled();
  });
});
