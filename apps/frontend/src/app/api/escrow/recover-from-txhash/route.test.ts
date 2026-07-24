import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/hasura', () => ({
  updateEscrowStatusByContractId: vi.fn(),
}));

vi.mock('@/lib/server/trustlesswork', () => ({
  trustlessWorkRequest: vi.fn(),
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

import { POST } from './route';
import { updateEscrowStatusByContractId } from '@/lib/server/hasura';
import { trustlessWorkRequest } from '@/lib/server/trustlesswork';

const mockUpdate = vi.mocked(updateEscrowStatusByContractId);
const mockIndexer = vi.mocked(trustlessWorkRequest);

function req(body: unknown, { badJson = false } = {}) {
  return {
    json: async () => {
      if (badJson) throw new Error('bad json');
      return body;
    },
  } as unknown as Parameters<typeof POST>[0];
}

function affected(rows: number) {
  return { update_escrows: { affected_rows: rows } };
}

const validFund = { txHash: 'a3f9', action: 'fund', contractId: 'CAZT', amount: 950 };

beforeEach(() => {
  vi.clearAllMocks();
  mockIndexer.mockResolvedValue({} as never);
  mockUpdate.mockResolvedValue(affected(1));
});

describe('POST /api/escrow/recover-from-txhash — validation', () => {
  it('400 on invalid JSON', async () => {
    const res = await POST(req(null, { badJson: true }));
    expect(res.status).toBe(400);
  });

  it('400 when txHash missing', async () => {
    const res = await POST(req({ action: 'fund', contractId: 'CAZT', amount: 1 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/txHash/);
  });

  it('400 when action missing', async () => {
    const res = await POST(req({ txHash: 'a3f9', contractId: 'CAZT' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/action/);
  });

  it('400 listing valid options on invalid action', async () => {
    const res = await POST(req({ txHash: 'a3f9', action: 'nope', contractId: 'CAZT' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/initialize, fund/);
  });

  it('400 when contractId missing', async () => {
    const res = await POST(req({ txHash: 'a3f9', action: 'fund', amount: 1 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/contractId/);
  });

  it('400 when an action-specific field is missing (fund without amount)', async () => {
    const res = await POST(req({ txHash: 'a3f9', action: 'fund', contractId: 'CAZT' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/amount/);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('400 when approve_milestone is missing approver', async () => {
    const res = await POST(
      req({ txHash: 'a3f9', action: 'approve_milestone', contractId: 'CAZT', milestoneId: 'm1' }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/approver/);
  });
});

describe('POST /api/escrow/recover-from-txhash — recovery flow', () => {
  it('re-indexes in TW before updating the DB', async () => {
    const order: string[] = [];
    mockIndexer.mockImplementation(async () => {
      order.push('indexer');
      return {} as never;
    });
    mockUpdate.mockImplementation(async () => {
      order.push('db');
      return affected(1);
    });

    await POST(req(validFund));

    expect(mockIndexer).toHaveBeenCalledWith('/indexer/update-from-txHash', {
      method: 'POST',
      body: { txHash: 'a3f9' },
    });
    expect(order).toEqual(['indexer', 'db']);
  });

  it('continues DB recovery even when the TW indexer call fails', async () => {
    mockIndexer.mockRejectedValue(new Error('TW down'));
    const res = await POST(req(validFund));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ recovered: true, action: 'fund' });
    expect(mockUpdate).toHaveBeenCalledOnce();
  });

  it('returns recovered payload with the mapped status', async () => {
    const res = await POST(req(validFund));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      recovered: true,
      action: 'fund',
      contractId: 'CAZT',
      txHash: 'a3f9',
      status: 'funded',
    });
  });

  it.each([
    ['initialize', 'pending_signature', { engagementId: 'e', apartmentId: 'ap', senderAddress: 's', receiverAddress: 'r', releaser: 'rl', amount: 1 }],
    ['fund', 'funded', { amount: 1 }],
    ['approve_milestone', 'funded', { milestoneId: 'm', approver: 'ap' }],
    ['release_funds', 'completed', { releaseSigner: 'rs' }],
    ['dispute', 'disputed', {}],
    ['resolve_dispute', 'resolved', {}],
  ])('maps action %s to escrow status %s', async (action, status, extra) => {
    const res = await POST(req({ txHash: 'a3f9', action, contractId: 'CAZT', ...extra }));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith('CAZT', status);
  });

  it('404 when no escrow row matches contractId', async () => {
    mockUpdate.mockResolvedValue(affected(0));
    const res = await POST(req(validFund));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toMatch(/No escrow record/);
  });

  it('500 when the DB update throws', async () => {
    mockUpdate.mockRejectedValue(new Error('hasura boom'));
    const res = await POST(req(validFund));
    expect(res.status).toBe(500);
  });
});
