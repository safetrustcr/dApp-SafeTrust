import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fundEscrowHandler } from '../fund.handler.js';

vi.mock('../../../services/trustlesswork.js', () => ({
  trustlessWorkRequest: vi.fn(),
  TrustlessWorkRequestError: class extends Error {
    constructor(message, statusCode, messages, payload) {
      super(message);
      this.statusCode = statusCode;
      this.messages = messages;
      this.payload = payload;
    }
  },
  getErrorMessages: vi.fn((err, fallback) => [err?.message || fallback]),
}));

import { trustlessWorkRequest } from '../../../services/trustlesswork.js';
import { mockReq, mockRes } from './helpers.js';

describe('fundEscrowHandler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when contractId is missing', async () => {
    const res = mockRes();
    await fundEscrowHandler(mockReq({ signer: 'GSIGNER', amount: 1200, engagementId: 'e1' }), res);

    expect(res._status).toBe(400);
    expect(res._body.error).toContain('contractId');
  });

  it('returns 400 when signer is missing', async () => {
    const res = mockRes();
    await fundEscrowHandler(mockReq({ contractId: 'CAZT001', amount: 1200, engagementId: 'e1' }), res);

    expect(res._status).toBe(400);
    expect(res._body.error).toContain('signer');
  });

  it('calls TrustlessWork /escrow/single-release/v2/fund with correct body', async () => {
    vi.mocked(trustlessWorkRequest).mockResolvedValueOnce({
      unsignedXdr: 'FUND_XDR_001',
      txHash: 'hash-123',
    });

    const res = mockRes();
    await fundEscrowHandler(
      mockReq({ contractId: 'CAZT001', signer: 'GSIGNER', amount: 950, engagementId: 'e1' }),
      res,
    );

    expect(trustlessWorkRequest).toHaveBeenCalledWith(
      '/escrow/single-release/v2/fund',
      {
        method: 'POST',
        body: { contractId: 'CAZT001', signer: 'GSIGNER', amount: 950 },
      },
    );
    expect(res._status).toBe(200);
    expect(res._body).toEqual({
      unsignedXdr: 'FUND_XDR_001',
      txHash: 'hash-123',
      contractId: 'CAZT001',
      engagementId: 'e1',
    });
  });
});
