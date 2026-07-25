import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/server/escrow-db', () => ({
  dbInitializeEscrow: vi.fn(),
  dbFundEscrow: vi.fn(),
  dbApproveMilestone: vi.fn(),
  dbReleaseFunds: vi.fn(),
  dbDisputeEscrow: vi.fn(),
  dbResolveDispute: vi.fn(),
}));

vi.mock('@/lib/server/hasura', () => ({
  hasuraRequest: vi.fn(),
  insertEscrowRecord: vi.fn(),
}));

vi.mock('@/lib/server/trustlesswork', () => ({
  trustlessWorkRequest: vi.fn(),
  extractTransactionHash: vi.fn(() => 'tx-hash-123'),
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
}));

vi.mock('@/lib/trustlesswork-errors', () => ({
  getErrorMessages: vi.fn((_source, fallback) => [fallback]),
}));

import { POST } from './route';
import {
  dbInitializeEscrow,
  dbFundEscrow,
  dbApproveMilestone,
  dbReleaseFunds,
  dbDisputeEscrow,
  dbResolveDispute,
} from '@/lib/server/escrow-db';
import { hasuraRequest, insertEscrowRecord } from '@/lib/server/hasura';
import { trustlessWorkRequest, TrustlessWorkRequestError } from '@/lib/server/trustlesswork';

const mockTw = vi.mocked(trustlessWorkRequest);
const mockInit = vi.mocked(dbInitializeEscrow);
const mockFund = vi.mocked(dbFundEscrow);
const mockApprove = vi.mocked(dbApproveMilestone);
const mockRelease = vi.mocked(dbReleaseFunds);
const mockDispute = vi.mocked(dbDisputeEscrow);
const mockResolve = vi.mocked(dbResolveDispute);
const mockHasuraRequest = vi.mocked(hasuraRequest);
const mockInsertEscrow = vi.mocked(insertEscrowRecord);

function req(body: unknown) {
  return {
    json: async () => body,
  } as unknown as Parameters<typeof POST>[0];
}

function twSuccess(overrides: Record<string, unknown> = {}) {
  return { status: 'SUCCESS', message: 'ok', contractId: 'CA1234', ...overrides };
}

const initPayload = {
  signedXdr: 'AAAA...',
  action: 'initialize',
  contractId: 'CA1234',
  engagementId: 'eng-1',
  propertyId: 'apt-1',
  senderAddress: 'GABC',
  receiverAddress: 'GDEF',
  releaser: 'GHIJ',
  amount: 1000,
};

const fundPayload = {
  signedXdr: 'AAAA...',
  action: 'fund',
  contractId: 'CA1234',
  amount: 500,
};

const approvePayload = {
  signedXdr: 'AAAA...',
  action: 'approve_milestone',
  contractId: 'CA1234',
  milestoneId: 'check_in',
  approver: 'GAPPROVER',
};

const releasePayload = {
  signedXdr: 'AAAA...',
  action: 'release_funds',
  contractId: 'CA1234',
  releaseSigner: 'GRELEASER',
};

const disputePayload = {
  signedXdr: 'AAAA...',
  action: 'dispute',
  contractId: 'CA1234',
};

const resolvePayload = {
  signedXdr: 'AAAA...',
  action: 'resolve_dispute',
  contractId: 'CA1234',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockTw.mockResolvedValue(twSuccess() as never);
  mockHasuraRequest.mockResolvedValue({ escrows: [] });
  mockInsertEscrow.mockResolvedValue({ insert_escrows_one: { id: 'default-escrow-id' } });
});

describe('POST /helper/send-transaction — validation', () => {
  it('400 on invalid JSON', async () => {
    const reqBad = { json: async () => { throw new Error('bad json'); } } as unknown as Parameters<typeof POST>[0];
    const res = await POST(reqBad);
    expect(res.status).toBe(400);
  });

  it('400 when action missing', async () => {
    const res = await POST(req({ signedXdr: 'AAAA...', contractId: 'CA1234' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/action/);
  });

  it('400 listing valid options on invalid action', async () => {
    const res = await POST(req({ signedXdr: 'AAAA...', action: 'nope', contractId: 'CA1234' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/initialize, fund/);
  });

  it('400 when signedXdr missing', async () => {
    const res = await POST(req({ action: 'fund', contractId: 'CA1234' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/signedXdr/);
  });

  it('400 when contractId missing', async () => {
    const res = await POST(req({ signedXdr: 'AAAA...', action: 'fund' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/contractId/);
  });

  it('400 when initialize is missing amount', async () => {
    const res = await POST(req({
      signedXdr: 'AAAA...', action: 'initialize', contractId: 'CA1234',
      engagementId: 'e', propertyId: 'p', senderAddress: 's', receiverAddress: 'r', releaser: 'rl',
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/amount/);
  });

  it('400 when initialize has invalid amount', async () => {
    const res = await POST(req({ ...initPayload, amount: 0 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/positive number/);
  });

  it('400 when fund is missing amount', async () => {
    const res = await POST(req({ signedXdr: 'AAAA...', action: 'fund', contractId: 'CA1234' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/amount/);
  });

  it('400 when approve_milestone is missing approver', async () => {
    const res = await POST(req({
      signedXdr: 'AAAA...', action: 'approve_milestone', contractId: 'CA1234', milestoneId: 'm1',
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/approver/);
  });

  it('400 when release_funds is missing releaseSigner', async () => {
    const res = await POST(req({ signedXdr: 'AAAA...', action: 'release_funds', contractId: 'CA1234' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/releaseSigner/);
  });
});

describe('POST /helper/send-transaction — action dispatch', () => {
  it.each([
    ['initialize', initPayload, 'dbInitializeEscrow'],
    ['fund', fundPayload, 'dbFundEscrow'],
    ['approve_milestone', approvePayload, 'dbApproveMilestone'],
    ['release_funds', releasePayload, 'dbReleaseFunds'],
    ['dispute', disputePayload, 'dbDisputeEscrow'],
    ['resolve_dispute', resolvePayload, 'dbResolveDispute'],
  ])('routes action %s to %s', async (_action, payload, _fnName) => {
    const res = await POST(req(payload));
    expect(res.status).toBe(200);
  });

  it('initialize calls dbInitializeEscrow with correct params', async () => {
    mockInit.mockResolvedValueOnce();
    mockInsertEscrow.mockResolvedValueOnce({ insert_escrows_one: { id: 'esc-1' } });

    await POST(req(initPayload));

    expect(mockInit).toHaveBeenCalledWith({
      contractId: 'CA1234',
      engagementId: 'eng-1',
      apartmentId: 'apt-1',
      senderAddress: 'GABC',
      receiverAddress: 'GDEF',
      releaser: 'GHIJ',
      amount: 1000,
    });
  });

  it('initialize also calls insertEscrowRecord for backward compat', async () => {
    mockInit.mockResolvedValueOnce();
    mockInsertEscrow.mockResolvedValueOnce({ insert_escrows_one: { id: 'esc-1' } });

    await POST(req(initPayload));

    expect(mockInsertEscrow).toHaveBeenCalledTimes(1);
    expect(mockInsertEscrow).toHaveBeenCalledWith({
      contractId: 'CA1234',
      engagementId: 'eng-1',
      propertyId: 'apt-1',
      senderAddress: 'GABC',
      receiverAddress: 'GDEF',
      amount: 1000,
      status: 'funded',
    });
  });

  it('fund calls dbFundEscrow', async () => {
    mockFund.mockResolvedValueOnce();

    await POST(req(fundPayload));

    expect(mockFund).toHaveBeenCalledWith('CA1234', 500);
  });

  it('approve_milestone calls dbApproveMilestone', async () => {
    mockApprove.mockResolvedValueOnce();

    await POST(req(approvePayload));

    expect(mockApprove).toHaveBeenCalledWith('CA1234', 'check_in', 'GAPPROVER');
  });

  it('release_funds calls dbReleaseFunds', async () => {
    mockRelease.mockResolvedValueOnce();

    await POST(req(releasePayload));

    expect(mockRelease).toHaveBeenCalledWith('CA1234', 'GRELEASER');
  });

  it('dispute calls dbDisputeEscrow', async () => {
    mockDispute.mockResolvedValueOnce();

    await POST(req(disputePayload));

    expect(mockDispute).toHaveBeenCalledWith('CA1234');
  });

  it('resolve_dispute calls dbResolveDispute', async () => {
    mockResolve.mockResolvedValueOnce();

    await POST(req(resolvePayload));

    expect(mockResolve).toHaveBeenCalledWith('CA1234');
  });
});

describe('POST /helper/send-transaction — error handling', () => {
  it('502 when TrustlessWork returns non-SUCCESS', async () => {
    mockTw.mockResolvedValue({ status: 'FAILED', message: 'nope' } as never);

    const res = await POST(req(fundPayload));
    expect(res.status).toBe(502);
  });

  it('500 when DB update fails after confirmed transaction', async () => {
    mockFund.mockRejectedValueOnce(new Error('hasura boom'));

    const res = await POST(req(fundPayload));
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toMatch(/confirmed on-chain/);
    expect(body.transactionHash).toBe('tx-hash-123');
    expect(body.contractId).toBe('CA1234');
  });

  it('propagates TrustlessWorkRequestError from TW call', async () => {
    mockTw.mockRejectedValueOnce(new TrustlessWorkRequestError('TW error', 502, ['TW error']));

    const res = await POST(req(fundPayload));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/TW error/);
  });

  it('returns 200 with correct shape on success', async () => {
    mockFund.mockResolvedValueOnce();
    const res = await POST(req(fundPayload));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toMatchObject({
      status: 'SUCCESS',
      message: 'ok',
      contractId: 'CA1234',
      transactionHash: 'tx-hash-123',
    });
  });

  it('returns 200 with escrowId on initialize success', async () => {
    mockInit.mockResolvedValueOnce();
    mockInsertEscrow.mockResolvedValueOnce({ insert_escrows_one: { id: 'esc-escrow-456' } });

    const res = await POST(req(initPayload));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.escrowId).toBe('esc-escrow-456');
  });
});

describe('POST /helper/send-transaction — edge case validation', () => {
  it('400 when initialize amount is negative', async () => {
    const res = await POST(req({ ...initPayload, amount: -50 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/positive number/);
  });

  it('400 when fund amount is zero', async () => {
    const res = await POST(req({ ...fundPayload, amount: 0 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/positive number/);
  });

  it('400 when fund amount is NaN', async () => {
    const res = await POST(req({ ...fundPayload, amount: 'not-a-number' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/positive number/);
  });

  it('400 when required field is null (not just undefined)', async () => {
    const res = await POST(req({
      signedXdr: 'AAAA...', action: 'initialize', contractId: 'CA1234',
      engagementId: null, propertyId: 'p', senderAddress: 's', receiverAddress: 'r', releaser: 'rl', amount: 100,
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/engagementId/);
  });

  it('400 when JSON body is null', async () => {
    const res = await POST(req(null));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Invalid JSON body/);
  });

  it('400 when JSON body is an array', async () => {
    const res = await POST(req([]));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Invalid JSON body/);
  });

  it('400 when signedXdr is empty string', async () => {
    const res = await POST(req({ signedXdr: '', action: 'fund', contractId: 'CA1234', amount: 100 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/signedXdr/);
  });

  it('400 when contractId is whitespace-only string', async () => {
    const res = await POST(req({ signedXdr: 'AAAA...', action: 'fund', contractId: '  ' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/contractId/);
  });

  it('400 when engagementId is empty string for initialize', async () => {
    const res = await POST(req({
      signedXdr: 'AAAA...', action: 'initialize', contractId: 'CA1234',
      engagementId: '', propertyId: 'p', senderAddress: 's', receiverAddress: 'r', releaser: 'rl', amount: 100,
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/engagementId/);
  });
});

describe('POST /helper/send-transaction — idempotent legacy insert', () => {
  it('reuses existing public.escrows ID when record already exists', async () => {
    mockInit.mockResolvedValueOnce();
    mockHasuraRequest.mockResolvedValueOnce({ escrows: [{ id: 'existing-escrow-id' }] });

    const res = await POST(req(initPayload));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.escrowId).toBe('existing-escrow-id');
    expect(mockInsertEscrow).not.toHaveBeenCalled();
  });

  it('inserts new record when no existing public.escrows found', async () => {
    mockInit.mockResolvedValueOnce();
    mockHasuraRequest.mockResolvedValueOnce({ escrows: [] });

    const res = await POST(req(initPayload));

    expect(res.status).toBe(200);
    expect(mockInsertEscrow).toHaveBeenCalledTimes(1);
  });
});
