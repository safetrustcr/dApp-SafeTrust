import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@stellar/stellar-sdk', () => ({
  Networks: { TESTNET: 'Test SDF Network ; September 2015' },
  TransactionBuilder: {
    fromXDR: vi.fn((xdr: string) => {
      if (xdr === 'INVALID_XDR') {
        throw new Error('Invalid XDR');
      }
      return {
        hash: () => ({
          toString: () => 'txhash123',
        }),
      };
    }),
  },
}));

vi.mock('../../../services/pending-actions.js', () => ({
  getPendingActionByHash: vi.fn(),
  markPendingActionSubmitted: vi.fn(),
}));

vi.mock('../../../services/trustlesswork.js', () => ({
  trustlessWorkRequest: vi.fn(),
  extractTransactionHash: vi.fn(),
  getErrorMessages: vi.fn((err: unknown, fallback: string) => [
    (err as Error)?.message || fallback,
  ]),
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

import { sendTransactionHandler } from '../send-transaction.handler.js';
import { getPendingActionByHash, markPendingActionSubmitted } from '../../../services/pending-actions.js';
import { trustlessWorkRequest } from '../../../services/trustlesswork.js';
import { mockReq, mockRes } from './helpers.js';

describe('sendTransactionHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects missing or invalid signedXdr with 400', async () => {
    const res = mockRes();
    await sendTransactionHandler(mockReq({}) as never, res as never);

    expect(res._status).toBe(400);
    expect(res._body).toEqual({ error: 'Missing or invalid signedXdr' });
  });

  it('returns 500 when XDR parsing fails', async () => {
    const res = mockRes();
    await sendTransactionHandler(mockReq({ signedXdr: 'INVALID_XDR' }) as never, res as never);

    expect(res._status).toBe(500);
    expect(res._body).toEqual({ error: 'Invalid XDR', messages: ['Invalid XDR'] });
  });

  it('returns 404 when transaction is not in pending actions', async () => {
    vi.mocked(getPendingActionByHash).mockResolvedValue(null);

    const res = mockRes();
    await sendTransactionHandler(mockReq({ signedXdr: 'VALID_XDR' }) as never, res as never);

    expect(res._status).toBe(404);
    expect(res._body).toEqual({ error: 'Unknown transaction. Build it through SafeTrust first.' });
  });

  it('returns 403 when transaction was built for another user', async () => {
    vi.mocked(getPendingActionByHash).mockResolvedValue({
      id: 'p-1',
      built_for_uid: 'user-a',
      status: 'built',
      expires_at: new Date(Date.now() + 60000).toISOString(),
    } as never);

    const res = mockRes();
    const req = mockReq({ signedXdr: 'VALID_XDR' });
    req.user = { uid: 'user-b' };

    await sendTransactionHandler(req as never, res as never);

    expect(res._status).toBe(403);
    expect(res._body).toEqual({ error: 'This transaction was built for another user.' });
  });

  it('returns 200 idempotent replay when already submitted', async () => {
    vi.mocked(getPendingActionByHash).mockResolvedValue({
      id: 'p-1',
      built_for_uid: 'uid-1',
      status: 'submitted',
      expires_at: new Date(Date.now() + 60000).toISOString(),
    } as never);

    const res = mockRes();
    const req = mockReq({ signedXdr: 'VALID_XDR' });
    req.user = { uid: 'uid-1' };

    await sendTransactionHandler(req as never, res as never);

    expect(res._status).toBe(200);
    expect(res._body).toEqual({ txHash: 'txhash123', status: 'submitted' });
    expect(trustlessWorkRequest).not.toHaveBeenCalled();
  });

  it('returns 410 when transaction has expired', async () => {
    vi.mocked(getPendingActionByHash).mockResolvedValue({
      id: 'p-1',
      built_for_uid: 'uid-1',
      status: 'built',
      expires_at: new Date(Date.now() - 60000).toISOString(),
    } as never);

    const res = mockRes();
    const req = mockReq({ signedXdr: 'VALID_XDR' });
    req.user = { uid: 'uid-1' };

    await sendTransactionHandler(req as never, res as never);

    expect(res._status).toBe(410);
    expect(res._body).toEqual({ error: 'Transaction expired. Build it again.' });
  });

  it('submits valid transaction to Trustless Work and marks action submitted', async () => {
    vi.mocked(getPendingActionByHash).mockResolvedValue({
      id: 'p-1',
      built_for_uid: 'uid-1',
      status: 'built',
      expires_at: new Date(Date.now() + 60000).toISOString(),
    } as never);
    vi.mocked(trustlessWorkRequest).mockResolvedValue({ status: 'SUCCESS', message: 'ok' });

    const res = mockRes();
    const req = mockReq({ signedXdr: 'VALID_XDR' });
    req.user = { uid: 'uid-1' };

    await sendTransactionHandler(req as never, res as never);

    expect(trustlessWorkRequest).toHaveBeenCalledWith('/helper/send-transaction', {
      method: 'POST',
      body: { signedXdr: 'VALID_XDR' },
    });
    expect(markPendingActionSubmitted).toHaveBeenCalledWith('p-1');
    expect(res._status).toBe(200);
    expect(res._body).toEqual({
      txHash: 'txhash123',
      status: 'submitted',
      twResult: { status: 'SUCCESS', message: 'ok' },
    });
  });
});
